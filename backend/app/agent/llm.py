"""Claude LLM wrapper used by the SQL agent."""

from __future__ import annotations
import os
import anthropic


def call_llm(system: str, messages: list[dict]) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return response.content[0].text.strip()
