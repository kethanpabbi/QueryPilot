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

### Phase 3 — Guardrails (upcoming)
SQLGlot AST: block DDL/DML, enforce LIMIT 500, scope tables to active dataset.

### Phase 4 — Result Explanation (upcoming)
Second LLM call post-execution, SSE streaming, follow-up question suggestions.

### Phase 5 — Chat UI (upcoming)
React chat interface with dataset/model pickers, SQL toggle, guardrail badges.

### Phase 6 — Deploy (upcoming)
Railway Dockerfile + Vercel config, example prompt chips, README.
