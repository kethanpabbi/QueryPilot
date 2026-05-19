# QueryPilot

Ask questions in plain English, get SQL + results + an explanation.

QueryPilot is a natural-language-to-SQL agent that lets you query real datasets without writing a single line of SQL. It uses a LangGraph agent to generate SQL, validates it with SQLGlot AST parsing, executes it against DuckDB, and streams back an explanation of the results.

---

## Features

- **Natural language → SQL** — powered by Claude or GPT-4o (switchable)
- **AST-based guardrails** — SQLGlot parses every query before it runs; blocks `DROP`, `DELETE`, `INSERT`, etc., enforces `LIMIT 500`, rejects out-of-scope tables
- **Stateful agent** — LangGraph graph: `generate_sql → validate_sql → execute_sql`
- **Result explanation** — second LLM call explains results in plain English and suggests follow-up questions, streamed via SSE
- **Two datasets** — NYC Taxi (Parquet) and E-commerce (CSV), selectable from the UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + Tailwind + shadcn/ui |
| Backend | FastAPI + LangGraph |
| SQL Engine | DuckDB (in-process) |
| SQL Validation | SQLGlot (AST) |
| LLMs | Claude (Anthropic) + OpenAI |
| Deploy | Vercel (frontend) + Railway (backend) |

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
│   ├── main.py
│   └── requirements.txt
├── frontend/              # React app (Phase 5)
├── DEVLOG.md              # Dev log and architecture notes
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- An [Anthropic API key](https://console.anthropic.com/) and/or [OpenAI API key](https://platform.openai.com/)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# fill in your API keys in .env

uvicorn main:app --reload
```

API will be running at `http://localhost:8000`.

### Endpoints (so far)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/schema?dataset=nyc_taxi` | Returns schema + sample rows for a dataset |

---

## Datasets

| Dataset | Tables | Source |
|---|---|---|
| NYC Taxi | `nyc_taxi` | NYC TLC yellow cab trips, Jan 2024 (Parquet) |
| E-commerce | `orders` | Olist orders dataset (CSV) |

DuckDB reads these remotely via `httpfs` — no files are downloaded to disk.

---

## Development Progress

- [x] Phase 1 — Data Layer (DuckDB loader + SchemaInspector)
- [ ] Phase 2 — Core SQL Agent (LangGraph)
- [ ] Phase 3 — Guardrails (SQLGlot AST)
- [ ] Phase 4 — Result Explanation + SSE streaming
- [ ] Phase 5 — Chat UI (React)
- [ ] Phase 6 — Deploy (Railway + Vercel)

See [DEVLOG.md](DEVLOG.md) for detailed notes on each phase.

---

## License

MIT
