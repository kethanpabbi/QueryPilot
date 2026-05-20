"""
Result explainer — two LLM calls after SQL execution:

1. Stream the explanation token-by-token (SSE)
2. Return 3 follow-up question suggestions as a final SSE event

Both Claude and OpenAI are supported via the same async interface.
"""

from __future__ import annotations
import os
import json
from typing import AsyncGenerator
import anthropic
import openai

EXPLAIN_SYSTEM = """You are a friendly data analyst explaining query results to a non-technical user.
You will be given a SQL query and its results. Write a clear 2-sentence explanation of what the results show.
Be specific — mention actual numbers or patterns from the data. Do not use jargon."""

FOLLOWUP_SYSTEM = """You are a data analyst helping users explore a dataset.
Given a question and its SQL results, suggest exactly 3 short follow-up questions the user might want to ask next.
Return ONLY a JSON array of 3 strings. Example: ["Question 1?", "Question 2?", "Question 3?"]"""


def _build_explain_message(question: str, sql: str, rows: list[dict]) -> str:
    # Send at most 10 rows to the LLM to keep the prompt short
    preview = json.dumps(rows[:10], default=str, indent=2)
    return (
        f"User question: {question}\n\n"
        f"SQL query:\n{sql}\n\n"
        f"Results ({len(rows)} rows total, showing first 10):\n{preview}"
    )


# ── Streaming explanation ─────────────────────────────────────────────────────

async def stream_explanation(
    question: str,
    sql: str,
    rows: list[dict],
    model: str,
) -> AsyncGenerator[str, None]:
    """Async generator that yields explanation text tokens one at a time."""
    content = _build_explain_message(question, sql, rows)

    if model == "claude":
        async for token in _stream_claude(EXPLAIN_SYSTEM, content):
            yield token
    elif model == "openai":
        async for token in _stream_openai(EXPLAIN_SYSTEM, content):
            yield token
    else:
        raise ValueError(f"Unknown model: {model}")


async def _stream_claude(system: str, content: str) -> AsyncGenerator[str, None]:
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    async with client.messages.stream(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=system,
        messages=[{"role": "user", "content": content}],
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def _stream_openai(system: str, content: str) -> AsyncGenerator[str, None]:
    client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=512,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
        stream=True,
    )
    async for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token


# ── Follow-up questions (non-streaming, fast) ────────────────────────────────

async def get_followups(
    question: str,
    sql: str,
    rows: list[dict],
    model: str,
) -> list[str]:
    """Return 3 follow-up question strings."""
    content = _build_explain_message(question, sql, rows)

    if model == "claude":
        raw = await _call_claude_once(FOLLOWUP_SYSTEM, content)
    else:
        raw = await _call_openai_once(FOLLOWUP_SYSTEM, content)

    try:
        questions = json.loads(raw)
        if isinstance(questions, list):
            return [str(q) for q in questions[:3]]
    except json.JSONDecodeError:
        pass

    # Fallback if the model didn't return clean JSON
    return [
        "What trends do you see over time?",
        "How does this compare across different groups?",
        "What is the distribution of the top values?",
    ]


async def _call_claude_once(system: str, content: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        system=system,
        messages=[{"role": "user", "content": content}],
    )
    return response.content[0].text.strip()


async def _call_openai_once(system: str, content: str) -> str:
    client = openai.AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=256,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": content},
        ],
    )
    return response.choices[0].message.content.strip()
