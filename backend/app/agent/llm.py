"""
Provider-agnostic LLM wrapper.

Both Claude and OpenAI are called through the same interface:
    call_llm(model="claude", system=..., messages=[...]) -> str

Swap the provider by passing model="claude" or model="openai".
"""

from __future__ import annotations
import os
import anthropic
import openai


def call_llm(
    model: str,
    system: str,
    messages: list[dict],
) -> str:
    """
    Call the selected LLM and return the response text.

    Args:
        model: "claude" or "openai"
        system: system prompt string
        messages: list of {"role": "user"/"assistant", "content": "..."} dicts
    """
    if model == "claude":
        return _call_claude(system, messages)
    elif model == "openai":
        return _call_openai(system, messages)
    else:
        raise ValueError(f"Unknown model provider: '{model}'. Use 'claude' or 'openai'.")


def _call_claude(system: str, messages: list[dict]) -> str:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        messages=messages,
    )
    return response.content[0].text.strip()


def _call_openai(system: str, messages: list[dict]) -> str:
    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    full_messages = [{"role": "system", "content": system}] + messages
    response = client.chat.completions.create(
        model="gpt-5-nano",
        messages=full_messages,
        max_tokens=1024,
    )
    return response.choices[0].message.content.strip()
