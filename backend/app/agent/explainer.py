"""
Result explainer — two LLM calls after SQL execution:

1. Stream the explanation token-by-token (SSE)
2. Return 3 follow-up question suggestions as a final SSE event
"""

from __future__ import annotations
import os
import json
from typing import AsyncGenerator
import anthropic

EXPLAIN_SYSTEM = """You are a friendly data analyst explaining query results to a non-technical user.
You will be given a SQL query and its results. Write a clear 2-sentence explanation of what the results show.
Be specific — mention actual numbers or patterns from the data. Do not use jargon."""

FOLLOWUP_SYSTEM = """You are a data analyst helping users explore a dataset.
Given a question and its SQL results, suggest exactly 3 short follow-up questions the user might want to ask next.
Return ONLY a JSON array of 3 strings. Example: ["Question 1?", "Question 2?", "Question 3?"]"""


def _build_explain_message(question: str, sql: str, rows: list[dict]) -> str:
    preview = json.dumps(rows[:10], default=str, indent=2)
    return (
        f"User question: {question}\n\n"
        f"SQL query:\n{sql}\n\n"
        f"Results ({len(rows)} rows total, showing first 10):\n{preview}"
    )


async def stream_explanation(
    question: str,
    sql: str,
    rows: list[dict],
) -> AsyncGenerator[str, None]:
    """Async generator that yields explanation text tokens one at a time."""
    content = _build_explain_message(question, sql, rows)
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    async with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=EXPLAIN_SYSTEM,
        messages=[{"role": "user", "content": content}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def get_followups(
    question: str,
    sql: str,
    rows: list[dict],
) -> list[str]:
    """Return 3 follow-up question strings."""
    content = _build_explain_message(question, sql, rows)
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=FOLLOWUP_SYSTEM,
        messages=[{"role": "user", "content": content}],
    )
    raw = response.content[0].text.strip()

    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        cleaned = "\n".join(
            line for line in lines if not line.strip().startswith("```")
        ).strip()

    try:
        questions = json.loads(cleaned)
        if isinstance(questions, list) and questions:
            return [str(q) for q in questions[:3]]
    except json.JSONDecodeError:
        pass

    return [
        "What trends do you see over time?",
        "How does this compare across different groups?",
        "What is the distribution of the top values?",
    ]
