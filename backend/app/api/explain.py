"""
POST /explain — SSE stream of result explanation + follow-up questions.

SSE event types the client receives:
  event: token      data: <text chunk>       — explanation, streamed word by word
  event: follow_ups data: ["q1", "q2", "q3"] — JSON array, sent once at the end
  event: error      data: <message>           — if something goes wrong
  event: done       data: ""                  — stream is finished
"""

import json
from fastapi import APIRouter
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from app.agent.explainer import stream_explanation, get_followups

router = APIRouter()


class ExplainRequest(BaseModel):
    question: str = Field(..., description="The original natural language question")
    sql: str = Field(..., description="The SQL that was executed")
    rows: list[dict] = Field(..., description="The query result rows")
    model: str = Field("claude", description="'claude' or 'openai'")


@router.post("/explain")
async def explain(req: ExplainRequest):
    """Stream an explanation of query results, then send follow-up suggestions."""

    async def event_generator():
        try:
            # 1. Stream explanation tokens
            async for token in stream_explanation(
                question=req.question,
                sql=req.sql,
                rows=req.rows,
                model=req.model,
            ):
                yield {"event": "token", "data": token}

            # 2. Fetch follow-up questions and send as a single event
            followups = await get_followups(
                question=req.question,
                sql=req.sql,
                rows=req.rows,
                model=req.model,
            )
            yield {"event": "follow_ups", "data": json.dumps(followups)}

        except Exception as e:
            yield {"event": "error", "data": str(e)}

        finally:
            yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
