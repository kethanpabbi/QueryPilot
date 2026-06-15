"""POST /query — runs the full SQL agent pipeline."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.agent.graph import run_query

router = APIRouter()


class QueryRequest(BaseModel):
    question: str = Field(..., description="Plain English question about the dataset")
    dataset: str = Field(..., description="'chinook' or 'ecommerce'")
    model: str = Field("claude", description="'claude' or 'openai'")


class QueryResponse(BaseModel):
    question: str
    sql: str
    rows: list[dict]
    row_count: int
    error: str | None
    error_code: str | None  # BLOCKED_STATEMENT | INVALID_TABLE | PARSE_ERROR | None


@router.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    if req.dataset not in ("chinook", "ecommerce"):
        raise HTTPException(status_code=400, detail="dataset must be 'chinook' or 'ecommerce'")
    if req.model not in ("claude", "openai"):
        raise HTTPException(status_code=400, detail="model must be 'claude' or 'openai'")

    result = run_query(
        question=req.question,
        dataset=req.dataset,
        model=req.model,
    )

    return QueryResponse(
        question=req.question,
        sql=result["sql"],
        rows=result["rows"],
        row_count=result["row_count"],
        error=result["error"],
        error_code=result.get("error_code"),
    )
