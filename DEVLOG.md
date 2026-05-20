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
| LLMs | Claude (Anthropic) + OpenAI, switchable | — |
| Datasets | NYC Taxi (Parquet) + E-commerce (CSV) | — |

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

### Phase 6 — Polish: Error UX + Markdown Rendering ✅
**Goal:** Fix two user-facing bugs surfaced during real query testing.

#### Bug 1 — Misleading "Parse Error" on unanswerable questions

When a question requires data not in the schema (e.g. "What are the names of these pickup locations?" against a dataset with only numeric IDs), the model returns prose instead of SQL. This hit the SQLGlot parse step and showed a red "🚫 Parse Error" badge — confusing because no SQL was malformed.

**Fix:**
- System prompt now instructs the model: if the question can't be answered with the available schema, return exactly `-- UNANSWERABLE: <brief reason>`
- `validator.py` detects the sentinel first (step 0.5), extracts the reason, and returns `error_code="UNANSWERABLE"`
- Fallback: if the model ignores the instruction and returns prose anyway, the parse-error catch checks the first token — if it's not a SQL keyword, it's treated as `UNANSWERABLE` rather than `PARSE_ERROR`
- New `EMPTY_SQL` error code was already in the validator; now surfaced in the badge too

**GuardrailBadge now has two visual tiers:**

| Error code | Color | Icon | Meaning |
|---|---|---|---|
| `BLOCKED_STATEMENT`, `INVALID_TABLE`, `PARSE_ERROR` | Red | 🚫 | Guardrail violation / malformed SQL |
| `UNANSWERABLE`, `EMPTY_SQL` | Amber | ℹ️ | Data not available in schema |

**Files changed:** `backend/app/agent/prompts.py`, `backend/app/guardrails/validator.py`, `frontend/src/components/GuardrailBadge.tsx`

---

#### Bug 2 — Italic text not rendering in explanations

`normalizeMarkdown` had four regex patterns meant to fix an OpenAI streaming artifact (`"** word **"` → `"**word**"`). The two single-`*` patterns were too aggressive:

- `/\s+\*/g` removed the space before an opening `*` — e.g. `"text *italic*"` → `"text*italic*"`
- CommonMark requires whitespace before a left-flanking `*` delimiter, so stripping it prevented italic from rendering entirely

**Fix:** Removed the single-`*` patterns. Only the `**` patterns are kept (they fix the confirmed OpenAI bold artifact without side effects). Also added explicit `prose-em` and `prose-strong` Tailwind classes so bold/italic are visually distinct on the dark background.

**Files changed:** `frontend/src/components/ResultCard.tsx`

---

### Phase 7 — Deploy (upcoming)
Railway Dockerfile + Vercel config, README.
