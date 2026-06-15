# QueryPilot — Dev Log & Reference

Natural-language-to-SQL agent. Ask questions in plain English, get SQL + results + an explanation.

---

## Stack

| Layer | Technology | Deploy |
|---|---|---|
| Frontend | React (Vite) + Tailwind + shadcn/ui | Vercel |
| Backend | FastAPI + LangGraph | Railway |
| SQL Engine | DuckDB (in-process) | — |
| SQL Validation | SQLGlot (AST-based) | — |
| LLM | Claude `claude-haiku-4-5-20251001` (Anthropic only) | — |
| Datasets | Chinook music store (11 tables) + IMDB top 20k movies | — |

---

## Project Structure

```
QueryPilot/
├── backend/
│   ├── app/
│   │   ├── data/          # DuckDB loader + SchemaInspector
│   │   ├── guardrails/    # SQLGlot AST validation
│   │   ├── agent/         # LangGraph SQL agent
│   │   └── api/           # FastAPI routes
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py
├── frontend/              # React app (added in Phase 5)
├── DEVLOG.md              # ← this file
└── .gitignore
```

---

## Phases

### Phase 1 — Data Layer ✅
**Goal:** Load datasets into DuckDB and expose schema context for LLM prompts.

**Files added:**
- `backend/requirements.txt` — Python dependencies
- `backend/.env.example` — API key template
- `backend/main.py` — FastAPI app entry point
- `backend/app/data/loader.py` — Registers NYC Taxi and E-commerce datasets as DuckDB views
- `backend/app/data/schema.py` — SchemaInspector: extracts table names, column names, types, and 2 sample rows

**Key decisions:**
- DuckDB runs **in-process** (no separate server). Views are lazy — data is only fetched when a query actually runs.
- `httpfs` extension lets DuckDB read remote Parquet/CSV directly without downloading files to disk.
- Schema context is rendered as a plain-text string and injected into every LLM prompt.
- `DATASET_TABLES` map controls which tables belong to which dataset — used by guardrails in Phase 3.

**Datasets:**
- **NYC Taxi** — `nyc_taxi` view over `yellow_tripdata_2024-01.parquet` (public S3/CloudFront)
- **E-commerce** — `orders` view over Olist orders CSV (public GitHub)

**How to test Phase 1:**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
# GET http://localhost:8000/schema?dataset=nyc_taxi
# GET http://localhost:8000/schema?dataset=ecommerce
```

---

### Phase 2 — Core SQL Agent ✅
**Goal:** LangGraph agent that takes a natural language question and returns SQL + results.

**Files added:**
- `backend/app/agent/prompts.py` — System prompt template with schema context injection
- `backend/app/agent/llm.py` — Provider-agnostic wrapper: same interface for Claude and OpenAI
- `backend/app/agent/graph.py` — LangGraph StateGraph with 3 nodes + `run_query()` entry point
- `backend/app/api/query.py` — `POST /query` route

**Graph flow:**
```
START → generate_sql → validate_sql → execute_sql → END
```

**Key decisions:**
- `AgentState` is a TypedDict that flows through all nodes — each node reads what it needs and returns only the fields it updates
- `validate_sql` is a passthrough stub here — Phase 3 replaces it with full SQLGlot AST validation
- `call_llm()` in `llm.py` is the single swap point for providers — pass `model="claude"` or `model="openai"`
- Claude uses `claude-sonnet-4-6`, OpenAI uses `gpt-4o`
- The LLM is instructed to return raw SQL only; the node also strips markdown fences if the model wraps it anyway

**API:**
```
POST /query
{
  "question": "What is the average fare amount?",
  "dataset": "nyc_taxi",
  "model": "claude"
}
```
Returns: `sql`, `rows`, `row_count`, `error`

**How to test Phase 2:**
```bash
# Server must be running with your API key in .env
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the average fare amount?", "dataset": "nyc_taxi", "model": "claude"}'
```

### Phase 3 — Guardrails ✅
**Goal:** Validate every generated SQL query with SQLGlot AST parsing before it touches DuckDB.

**Files added:**
- `backend/app/guardrails/validator.py` — three-layer validation pipeline

**Three checks (run in order):**

| Check | What it does | Error code |
|---|---|---|
| Blocked statements | Rejects DROP, DELETE, INSERT, UPDATE, CREATE, ALTER, TRUNCATE | `BLOCKED_STATEMENT` |
| Table scope | Rejects tables not in the active dataset | `INVALID_TABLE` |
| LIMIT enforcer | Injects `LIMIT 500` if no LIMIT is present | — (silent fix) |

**Key decisions:**
- Uses SQLGlot's real AST (`parse_one`) — not regex — so it catches nested/complex cases correctly
- LIMIT is injected by modifying the AST and re-rendering to DuckDB dialect, not string concatenation
- `error_code` is a machine-readable string (`BLOCKED_STATEMENT`, `INVALID_TABLE`, `PARSE_ERROR`) — used in Phase 5 to render the right UI badge
- `validate_sql` node in the graph now calls `validator.validate()` instead of being a passthrough stub
- `error_code` flows through `AgentState` and is returned in `POST /query` response

**How to test Phase 3:**
```bash
# Should be blocked (DROP)
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "drop the nyc_taxi table", "dataset": "nyc_taxi", "model": "claude"}'

# Should be blocked (wrong table)
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "select * from orders", "dataset": "nyc_taxi", "model": "claude"}'

# Should pass and have LIMIT 500 injected automatically
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "show me all trips", "dataset": "nyc_taxi", "model": "claude"}'
```

### Phase 4 — Result Explanation ✅
**Goal:** After SQL execution, stream a plain-English explanation of the results and suggest 3 follow-up questions.

**Files added:**
- `backend/app/agent/explainer.py` — async streaming explanation + follow-up question generator
- `backend/app/api/explain.py` — `POST /explain` SSE endpoint

**Flow:**
```
POST /explain (question + sql + rows + model)
    ↓
stream_explanation() → yields tokens one by one  →  event: token
    ↓
get_followups()      → returns ["q1","q2","q3"]  →  event: follow_ups
    ↓
                                                     event: done
```

**SSE event types the frontend listens for:**
| Event | Data | When |
|---|---|---|
| `token` | text chunk (string) | Streamed continuously during explanation |
| `follow_ups` | JSON array of 3 strings | Once, after explanation finishes |
| `error` | error message | If anything throws |
| `done` | `""` | Stream is complete |

**Key decisions:**
- `POST /query` stays synchronous (fast) — returns sql + rows immediately
- `POST /explain` is a separate SSE call — frontend opens it after receiving query results
- Both Claude and OpenAI use their **async** clients (`AsyncAnthropic`, `AsyncOpenAI`) so the stream doesn't block the server
- Follow-ups are a second non-streaming LLM call; the model is prompted to return a JSON array. A hardcoded fallback handles malformed responses.

**How to test Phase 4:**
```bash
# First get some rows from /query, then pipe them to /explain
curl -X POST http://localhost:8000/explain \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "question": "What is the average fare amount?",
    "sql": "SELECT AVG(fare_amount) FROM nyc_taxi LIMIT 500",
    "rows": [{"avg(fare_amount)": 18.5}],
    "model": "claude"
  }'
# You should see token events streaming in, then a follow_ups event, then done
```

### Phase 5 — Chat UI ✅
**Goal:** React chat interface wired to the backend, with streaming explanation, guardrail badges, and example prompt chips.

**Stack:** React + Vite + TypeScript + Tailwind CSS

**Files added:**
- `frontend/src/lib/types.ts` — shared TypeScript types (Dataset, Model, Message, QueryResponse)
- `frontend/src/lib/api.ts` — `runQuery()` and `streamExplanation()` fetch wrappers
- `frontend/src/components/TopBar.tsx` — dataset + model pickers
- `frontend/src/components/ExampleChips.tsx` — clickable prompt examples, changes per dataset
- `frontend/src/components/ResultCard.tsx` — SQL toggle, results table, streaming explanation, follow-up chips
- `frontend/src/components/ResultsTable.tsx` — sortable data table
- `frontend/src/components/GuardrailBadge.tsx` — red badge for blocked queries
- `frontend/src/components/InputBar.tsx` — textarea input, Enter to send
- `frontend/src/App.tsx` — root: state, message thread, orchestrates query + stream

**Key decisions:**
- SSE from a POST endpoint can't use the native `EventSource` API (GET only). Uses `fetch` + `ReadableStream` instead, manually parsing `event:` / `data:` lines.
- Explanation only streams if the query returned actual rows — no point explaining an error or empty result.
- Switching dataset clears the message thread (fresh context).
- `VITE_API_URL` env var controls the backend URL — defaults to `http://localhost:8000` for local dev.

**How to run locally:**
```bash
# Terminal 1 — backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend && npm run dev
# Open http://localhost:5173
```

### Phase 6 — Datasets, Offline Data Layer, Claude-only LLM, UI Redesign ✅
**Goal:** Replace NYC Taxi + E-commerce with Chinook + IMDB, remove OpenAI entirely, eliminate runtime network dependencies, and redesign key UI components.

#### Offline parquet data layer

The original loader fetched remote Parquet/CSV via DuckDB's `httpfs` at query time. This broke in deployed environments where the server process has outbound network restrictions.

**Fix:** All datasets are pre-built as parquet files and committed to `backend/data_cache/`. The loader reads from disk using `read_parquet()` at startup. Zero network calls at runtime.

- `backend/scripts/build_data.py` — downloads source files and regenerates parquet (run locally to refresh)
- `backend/data_cache/` — committed parquet files (~1.4 MB total): 11 Chinook tables + IMDB `movie` and `genre`
- `backend/app/data/loader.py` — completely rewritten: `load_dataset()` reads parquet, `ensure_loaded()` uses try/except existence check, `db_lock` (threading.Lock) exported for all callers

**Thread safety:** DuckDB in-memory connections are not thread-safe. FastAPI runs sync routes in a thread pool. All `conn.execute()` calls across `loader.py`, `schema.py`, and `graph.py` now hold `db_lock`.

#### Datasets switched

| Old | New |
|---|---|
| NYC Taxi (`nyc_taxi`) — 1 table, remote Parquet | Chinook music store — 11 relational tables, parquet |
| E-commerce (`orders`) — 1 table, remote CSV | IMDB top movies — `movie` (20k rows) + `genre` (44k rows), parquet |

IMDB data sourced from official IMDb TSV files; top 20k movies by vote count kept. The Godfather, Star Wars, Shawshank, etc. are all present (ranked by numVotes which correlates to popularity).

#### Claude-only LLM

OpenAI removed from all layers:
- `backend/app/agent/llm.py` — simplified to call only `anthropic.Anthropic`; no model param
- `backend/app/agent/explainer.py` — uses only `AsyncAnthropic`; no model param
- `backend/app/agent/graph.py` — `model` field removed from `AgentState`
- `backend/app/api/query.py` / `explain.py` — model field removed from request schemas
- `frontend/src/lib/types.ts` — `Model` type removed entirely
- `frontend/src/lib/api.ts` — no model param in `runQuery()` or `streamExplanation()`

#### UI redesign

- **TopBar** — custom dataset dropdown with Database/ChevronDown icons, sidebar toggle (Menu icon), clear-thread button (Trash2, only shown when messages exist); model picker removed
- **ExampleChips** — list-style layout with Sparkles/ArrowRight icons; IMDB-specific examples (top rated movies, genre breakdown, movies by decade, etc.)
- **ResultCard** — `HighlightedSql` component for syntax highlighting (keywords=violet, strings=amber, numbers=cyan); copy button for SQL; Terminal icon; redesigned card layout
- **App.tsx** — split-pane layout: collapsible SchemaBrowser sidebar on left, chat thread on right; mobile overlay drawer

#### Error UX (carried from earlier work)

- `UNANSWERABLE` and `EMPTY_SQL` error codes surface as amber badges (vs red for hard guardrail violations)
- System prompt instructs model to return `-- UNANSWERABLE: <reason>` instead of prose when schema can't answer the question

**Files changed:** `backend/app/data/loader.py`, `backend/app/data/schema.py`, `backend/app/agent/llm.py`, `backend/app/agent/explainer.py`, `backend/app/agent/graph.py`, `backend/app/api/query.py`, `backend/app/api/explain.py`, `backend/main.py`, `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`, `frontend/src/App.tsx`, `frontend/src/components/TopBar.tsx`, `frontend/src/components/ExampleChips.tsx`, `frontend/src/components/ResultCard.tsx`

---

### Phase 7 — Deploy ✅
**Goal:** Ship backend to Railway and frontend to Vercel with zero manual data setup.

**Live:** [query-pilot-psi.vercel.app](https://query-pilot-psi.vercel.app)

**Files added:**
- `backend/Procfile` — Railway start command: `web: uvicorn main:app --host 0.0.0.0 --port $PORT`
- `backend/runtime.txt` — pins Python 3.11 for Railway/Nixpacks
- `backend/requirements.txt` — removed unused `openai` dependency

**Files changed:**
- `backend/main.py` — CORS `allow_origins` now reads from `ALLOWED_ORIGINS` env var (comma-separated); defaults to `*` for local dev
- `backend/.env.example` — removed `OPENAI_API_KEY`, documented `ALLOWED_ORIGINS`

**Railway setup:**
- Root directory: `backend/`
- Railway reads `Procfile` for the start command; `runtime.txt` for Python version
- Env vars: `ANTHROPIC_API_KEY`, `ALLOWED_ORIGINS=https://query-pilot-psi.vercel.app`
- Parquet files are committed to the repo — no data build step at deploy time

**Vercel setup:**
- Root directory: `frontend/`
- Env var: `VITE_API_URL=https://querypilot-production.up.railway.app`
- Vite bakes env vars at build time — redeploy required after any env var change

**Key issues hit:**
- Railway initially failed (Railpack couldn't detect language) because root directory wasn't set to `backend/` — it saw the monorepo root instead
- CORS blocked all requests on first deploy — `ALLOWED_ORIGINS` wasn't set on Railway, so the backend was running with the correct middleware but the env var defaulted correctly to `*`; the actual issue was the env var needed to explicitly list the Vercel origin after tightening
