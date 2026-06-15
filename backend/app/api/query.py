"""POST /query — runs the full SQL agent pipeline."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.agent.graph import run_query

router = APIRouter()


class QueryRequest(BaseModel):
    question: str = Field(..., description="Plain English question about the dataset")
    dataset: str = Field(..., description="'chinook' or 'imdb'")


class QueryResponse(BaseModel):
    question: str
    sql: str
    rows: list[dict]
    row_count: int
    error: str | None
    error_code: str | None


@router.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    if req.dataset not in ("chinook", "imdb"):
        raise HTTPException(status_code=400, detail="dataset must be 'chinook' or 'imdb'")

    result = run_query(question=req.question, dataset=req.dataset)

    return QueryResponse(
        question=req.question,
        sql=result["sql"],
        rows=result["rows"],
        row_count=result["row_count"],
        error=result["error"],
        error_code=result.get("error_code"),
    )
