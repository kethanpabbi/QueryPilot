# QueryPilot

Ask questions in plain English, get SQL + results + a streamed explanation.

QueryPilot is a natural-language-to-SQL agent that lets you query real datasets without writing a single line of SQL. It uses a LangGraph agent to generate SQL, validates it with SQLGlot AST parsing before anything runs, executes it against DuckDB, and streams back a plain-English explanation of the results.

---

## Features

- **Natural language → SQL** — powered by Claude or GPT-4o, switchable from the UI
- **AST-based guardrails** — SQLGlot parses every query before it hits the database; blocks `DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `TRUNCATE`, `CREATE`; enforces `LIMIT 500`; rejects tables outside the active dataset
- **Stateful LangGraph agent** — `generate_sql → validate_sql → execute_sql`
- **Streamed explanation** — second LLM call after execution explains results in plain English token-by-token via SSE, then suggests 3 follow-up questions
- **Chat interface** — full conversation thread with SQL toggle, results table, guardrail badges, and clickable follow-up chips
- **Two real datasets** — Chinook music store (11 tables, SQLite) and E-commerce (CSV), switchable from the top bar
- **Schema browser** — expand any table to inspect columns and sample rows before querying

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + TypeScript + Tailwind CSS |
| Backend | FastAPI + LangGraph |
| SQL Engine | DuckDB (in-process, no server) |
| SQL Validation | SQLGlot (AST-based) |
| LLMs | Claude `claude-haiku-4-5-20251001` + OpenAI `gpt-5.4-mini` |
| Deploy | Vercel (frontend) + Railway (backend) |

---

## Project Structure

```
QueryPilot/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   ├── loader.py       # DuckDB connection + lazy dataset views
│   │   │   └── schema.py       # SchemaInspector → LLM prompt context
│   │   ├── guardrails/
│   │   │   └── validator.py    # SQLGlot AST: blocked stmts, table scope, LIMIT
│   │   ├── agent/
│   │   │   ├── llm.py          # Provider-agnostic wrapper (Claude / OpenAI)
│   │   │   ├── prompts.py      # System prompt templates
│   │   │   ├── graph.py        # LangGraph StateGraph
│   │   │   └── explainer.py    # Async streaming explanation + follow-ups
│   │   └── api/
│   │       ├── query.py        # POST /query
│   │       └── explain.py      # POST /explain (SSE)
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── TopBar.tsx         # Dataset + model pickers
│       │   ├── ExampleChips.tsx   # Clickable prompt examples
│       │   ├── SchemaBrowser.tsx  # Accordion table/column/sample-row browser
│       │   ├── ResultCard.tsx     # SQL toggle, table, explanation, follow-ups
│       │   ├── ResultsTable.tsx   # Data table
│       │   ├── GuardrailBadge.tsx # Guardrail error badges
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
- [Anthropic API key](https://console.anthropic.com/) and/or [OpenAI API key](https://platform.openai.com/)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Add your API keys to .env

make dev
# Running at http://localhost:8000

# Or directly:
uvicorn main:app
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
  "dataset": "chinook",
  "model": "claude"
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

| Dataset | Tables | Source |
|---|---|---|
| Chinook | 11 (artist, album, track, genre, invoice, customer, …) | [lerocha/chinook-database](https://github.com/lerocha/chinook-database) SQLite |
| E-commerce | `orders` | Olist orders dataset (CSV) |

Chinook is downloaded once at first query, materialised into DuckDB memory, and kept for the server session. E-commerce is read remotely via `httpfs`.

---

## Guardrails

Every generated SQL query passes through three checks before DuckDB sees it:

1. **Blocked statements** — rejects `DROP`, `DELETE`, `INSERT`, `UPDATE`, `CREATE`, `ALTER`, `TRUNCATE`
2. **Table scope** — rejects tables not in the active dataset
3. **LIMIT enforcer** — injects `LIMIT 500` via AST manipulation if no limit is present

Violations return a structured `error_code` (`BLOCKED_STATEMENT`, `INVALID_TABLE`, `PARSE_ERROR`) shown as a red badge in the UI.

---

## Development Progress

- [x] Phase 1 — Data Layer (DuckDB loader + SchemaInspector)
- [x] Phase 2 — Core SQL Agent (LangGraph)
- [x] Phase 3 — Guardrails (SQLGlot AST)
- [x] Phase 4 — Result Explanation + SSE streaming
- [x] Phase 5 — Chat UI (React)
- [x] Phase 6 — Polish (error UX, markdown rendering, Chinook dataset, schema browser)
- [ ] Phase 7 — Deploy (Railway + Vercel)

See [DEVLOG.md](DEVLOG.md) for detailed architecture notes on each phase.

---

## License

MIT
