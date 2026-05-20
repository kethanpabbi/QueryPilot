"""QueryPilot FastAPI application entry point."""

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.data.schema import inspect, schema_to_prompt_context
from app.api.query import router as query_router
from app.api.explain import router as explain_router

app = FastAPI(title="QueryPilot", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened to Vercel URL on deploy
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(query_router)
app.include_router(explain_router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/schema")
def get_schema(dataset: str = Query(..., description="'nyc_taxi' or 'ecommerce'")):
    """Return the schema (columns + sample rows) for the requested dataset."""
    if dataset not in ("nyc_taxi", "ecommerce"):
        raise HTTPException(status_code=400, detail="dataset must be 'nyc_taxi' or 'ecommerce'")
    try:
        tables = inspect(dataset)
        return {
            "dataset": dataset,
            "tables": [
                {
                    "name": t.name,
                    "columns": [{"name": c.name, "type": c.type} for c in t.columns],
                    "sample_rows": t.sample_rows,
                }
                for t in tables
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
