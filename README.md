# QueryPilot

Ask questions in plain English, get SQL + results + a streamed explanation.

QueryPilot is a natural-language-to-SQL agent that lets you query real datasets without writing a single line of SQL. It uses a LangGraph agent to generate SQL, validates it with SQLGlot AST parsing before anything runs, executes it against DuckDB, and streams back a plain-English explanation of the results.

---

## Features

- **Natural language → SQL** — powered by Claude (Anthropic)
- **AST-based guardrails** — SQLGlot parses every query before it hits the database; blocks `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`, `CREATE`; enforces `LIMIT 500`; rejects tables outside the active dataset
- **Stateful LangGraph agent** — `generate_sql → validate_sql → execute_sql`
- **Streamed explanation** — LLM explains results in plain English token-by-token via SSE, then suggests 3 follow-up questions
- **Two real datasets** — Chinook music store (11 relational tables) and IMDB top 20k movies, switchable from the UI
- **Schema browser** — collapsible sidebar showing columns and sample rows for every table
- **Offline data layer** — datasets are pre-built as parquet files (1.4 MB total), loaded into DuckDB at startup — no network calls at runtime

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript + Tailwind CSS |
| Backend | FastAPI + LangGraph |
| SQL Engine | DuckDB (in-process, no server) |
| SQL Validation | SQLGlot (AST-based) |
| LLM | Claude `claude-haiku-4-5-20251001` (Anthropic) |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
QueryPilot/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   ├── loader.py       # DuckDB connection + parquet-based dataset loading
│   │   │   └── schema.py       # SchemaInspector → LLM prompt context
│   │   ├── guardrails/
│   │   │   └── validator.py    # SQLGlot AST: blocked stmts, table scope, LIMIT
│   │   ├── agent/
│   │   │   ├── llm.py          # Claude wrapper
│   │   │   ├── prompts.py      # System prompt templates
│   │   │   ├── graph.py        # LangGraph StateGraph
│   │   │   └── explainer.py    # Async streaming explanation + follow-ups
│   │   └── api/
│   │       ├── query.py        # POST /query
│   │       └── explain.py      # POST /explain (SSE)
│   ├── data_cache/             # Pre-built parquet files (committed, ~1.4 MB)
│   ├── scripts/
│   │   └── build_data.py       # Re-generates parquet files (run to refresh data)
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── TopBar.tsx         # Dataset picker + sidebar toggle + clear thread
│       │   ├── ExampleChips.tsx   # Clickable prompt examples per dataset
│       │   ├── SchemaBrowser.tsx  # Collapsible schema sidebar
│       │   ├── ResultCard.tsx     # SQL toggle, results table, explanation, follow-ups
│       │   ├── ResultsTable.tsx   # Data table
│       │   ├── GuardrailBadge.tsx # Error badges (red / amber)
│       │   └── InputBar.tsx       # Chat input
│       ├── lib/
│       │   ├── api.ts             # runQuery() + streamExplanation() + fetchSchema()
│       │   └── types.ts           # Shared TypeScript types
│       └── App.tsx
├── DEVLOG.md
└── README.md
```

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Anthropic API key](https://console.anthropic.com/)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Add your API keys to .env

uvicorn main:app --reload
# Running at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/schema?dataset=chinook` | Schema + sample rows for a dataset |
| `POST` | `/query` | Run NL question through the SQL agent |
| `POST` | `/explain` | Stream explanation + follow-ups via SSE |

### POST /query

```json
{
  "question": "Which artist has the most albums?",
  "dataset": "chinook"
}
```

Returns `sql`, `rows`, `row_count`, `error`, `error_code`.

### POST /explain (SSE)

Streams three event types:

| Event | Data |
|---|---|
| `token` | Text chunk of the explanation |
| `follow_ups` | JSON array of 3 follow-up question strings |
| `done` | Empty — stream is finished |

---

## Datasets

| Dataset | Tables | Rows | Source |
|---|---|---|---|
| Chinook | 11 (artist, album, track, genre, invoice, customer, …) | ~15k total | [lerocha/chinook-database](https://github.com/lerocha/chinook-database) SQLite |
| IMDB | `movie` (20k), `genre` (44k) | ~64k total | [IMDb datasets](https://developer.imdb.com/non-commercial-datasets/) |

Both datasets are pre-built as parquet files (~1.4 MB total) committed to the repo and loaded into DuckDB at startup — no network calls at runtime.

---

## Guardrails

Every generated SQL query passes through three checks before DuckDB sees it:

1. **Blocked statements** — rejects `DROP`, `DELETE`, `INSERT`, `UPDATE`, `CREATE`, `ALTER`, `TRUNCATE`
2. **Table scope** — rejects tables not in the active dataset
3. **LIMIT enforcer** — injects `LIMIT 500` via AST manipulation if no limit is present

Violations return a structured `error_code` shown as a badge in the UI:

| `error_code` | Badge color | Meaning |
|---|---|---|
| `BLOCKED_STATEMENT` | Red | Destructive/write SQL attempted |
| `INVALID_TABLE` | Red | Table not in the active dataset |
| `PARSE_ERROR` | Red | SQL couldn't be parsed |
| `UNANSWERABLE` | Amber | LLM determined the question can't be answered with this schema |
| `EMPTY_SQL` | Amber | LLM returned no SQL |

---

## Development Progress

- [x] Phase 1 — Data Layer (DuckDB loader + SchemaInspector)
- [x] Phase 2 — Core SQL Agent (LangGraph)
- [x] Phase 3 — Guardrails (SQLGlot AST)
- [x] Phase 4 — Result Explanation + SSE streaming
- [x] Phase 5 — Chat UI (React)
- [x] Phase 6 — Polish: IMDB dataset, offline parquet data layer, Claude-only LLM, schema browser, UI redesign (TopBar, ExampleChips, ResultCard with syntax highlighting)
- [x] Phase 7 — Deploy: Railway (backend) + Vercel (frontend) — live at [query-pilot-psi.vercel.app](https://query-pilot-psi.vercel.app)

See [DEVLOG.md](DEVLOG.md) for detailed architecture notes on each phase.

---

## Deployment

### Backend — Railway

1. Create a new Railway project and connect this repo.
2. Set the root directory to `backend/`.
3. Add env vars: `ANTHROPIC_API_KEY=sk-ant-...` and `ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app`
4. Railway picks up `Procfile` → runs `uvicorn main:app --host 0.0.0.0 --port $PORT`.
5. The parquet files in `data_cache/` are committed to the repo and loaded at startup — no data download needed.
6. Generate a public domain under **Settings → Networking → Public Networking**.

### Frontend — Vercel

1. Create a new Vercel project and connect this repo.
2. Set the root directory to `frontend/`.
3. Add the env var: `VITE_API_URL=https://<your-railway-app>.up.railway.app`
4. Vercel auto-detects the Vite build config (`npm run build` → `dist/`).
5. **Redeploy after setting env vars** — Vite bakes them in at build time, so a redeploy is required for changes to take effect.

---

## License

MIT
