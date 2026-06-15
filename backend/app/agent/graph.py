"""
LangGraph SQL agent.

Graph flow:  generate_sql → validate_sql → execute_sql

State travels through all three nodes. Each node reads from state,
does its work, and returns a dict of fields to update.
"""

from __future__ import annotations
import json
from typing import TypedDict
from langgraph.graph import StateGraph, START, END

from app.data.schema import schema_to_prompt_context
from app.data.loader import get_connection, db_lock
from app.agent.llm import call_llm
from app.agent.prompts import SYSTEM_PROMPT, build_user_message
from app.guardrails.validator import validate


# ── State ────────────────────────────────────────────────────────────────────

class AgentState(TypedDict):
    question: str
    dataset: str
    schema_context: str
    sql: str
    validation_error: str | None
    error_code: str | None  # BLOCKED_STATEMENT | INVALID_TABLE | PARSE_ERROR | None
    rows: list[dict]
    row_count: int
    error: str | None


# ── Nodes ────────────────────────────────────────────────────────────────────

def generate_sql(state: AgentState) -> dict:
    """Ask the LLM to write SQL for the user's question."""
    system = SYSTEM_PROMPT.format(schema_context=state["schema_context"])
    messages = [{"role": "user", "content": build_user_message(state["question"])}]

    sql = call_llm(system=system, messages=messages)

    # Strip markdown code fences if the model wrapped the SQL anyway
    sql = sql.strip()
    if sql.startswith("```"):
        lines = sql.splitlines()
        # drop first and last fence lines
        sql = "\n".join(
            line for line in lines
            if not line.strip().startswith("```")
        ).strip()

    return {"sql": sql}


def validate_sql(state: AgentState) -> dict:
    """
    Run SQLGlot AST guardrails against the generated SQL.
    - Blocks DDL/DML statements
    - Rejects out-of-scope tables
    - Injects LIMIT 500 if missing
    """
    result = validate(sql=state["sql"], dataset=state["dataset"])

    if not result.valid:
        return {
            "validation_error": result.error,
            "error_code": result.error_code,
            "sql": state["sql"],   # preserve original for display
        }

    # result.sql may have LIMIT injected — update state with cleaned SQL
    return {"validation_error": None, "error_code": None, "sql": result.sql}


def execute_sql(state: AgentState) -> dict:
    """Run the validated SQL against DuckDB and return rows + row count."""
    if state.get("validation_error"):
        return {"rows": [], "row_count": 0, "error": state["validation_error"]}

    try:
        with db_lock:
            conn = get_connection()
            df = conn.execute(state["sql"]).fetchdf()
        rows = json.loads(df.to_json(orient="records"))
        return {"rows": rows, "row_count": len(rows), "error": None}
    except Exception as e:
        return {"rows": [], "row_count": 0, "error": str(e)}


# ── Graph ────────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("generate_sql", generate_sql)
    graph.add_node("validate_sql", validate_sql)
    graph.add_node("execute_sql", execute_sql)

    graph.add_edge(START, "generate_sql")
    graph.add_edge("generate_sql", "validate_sql")
    graph.add_edge("validate_sql", "execute_sql")
    graph.add_edge("execute_sql", END)

    return graph.compile()


# Compiled graph — imported by the API route
sql_agent = build_graph()


def run_query(question: str, dataset: str) -> dict:
    """Entry point called by the API. Returns the final agent state."""
    schema_context = schema_to_prompt_context(dataset)

    initial_state: AgentState = {
        "question": question,
        "dataset": dataset,
        "schema_context": schema_context,
        "sql": "",
        "validation_error": None,
        "error_code": None,
        "rows": [],
        "row_count": 0,
        "error": None,
    }

    result = sql_agent.invoke(initial_state)
    return result
