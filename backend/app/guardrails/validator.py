"""
SQLGlot AST-based SQL guardrails.

Three checks run in order on every query before it hits DuckDB:

1. Blocked statements  — rejects DDL/DML (DROP, DELETE, INSERT, etc.)
2. Table scope check   — rejects tables not in the active dataset
3. LIMIT enforcer      — injects LIMIT 500 if no LIMIT clause is present

Returns a ValidationResult with the (possibly modified) SQL and a
structured error if any check fails.
"""

from __future__ import annotations
from dataclasses import dataclass
import sqlglot
import sqlglot.expressions as exp

from app.data.schema import get_valid_tables


# Statements that are never allowed
BLOCKED_TYPES = (
    exp.Drop,
    exp.Delete,
    exp.Insert,
    exp.Update,
    exp.Create,
    exp.Alter,
    exp.TruncateTable,
)

BLOCKED_NAMES = {"DROP", "DELETE", "INSERT", "UPDATE", "CREATE", "ALTER", "TRUNCATE"}

MAX_ROWS = 500


@dataclass
class ValidationResult:
    valid: bool
    sql: str                  # original or modified (LIMIT injected)
    error: str | None         # human-readable message shown in the UI
    error_code: str | None    # machine-readable code for the frontend badge


def validate(sql: str, dataset: str) -> ValidationResult:
    """Run all guardrails. Returns on the first failure."""

    # ── 1. Parse ────────────────────────────────────────────────────────────
    try:
        parsed = sqlglot.parse_one(sql, dialect="duckdb")
    except sqlglot.errors.ParseError as e:
        return ValidationResult(
            valid=False,
            sql=sql,
            error=f"SQL could not be parsed: {e}",
            error_code="PARSE_ERROR",
        )

    # ── 2. Blocked statement types ───────────────────────────────────────────
    if isinstance(parsed, BLOCKED_TYPES):
        statement_type = type(parsed).__name__.upper()
        return ValidationResult(
            valid=False,
            sql=sql,
            error=(
                f"🚫 {statement_type} statements are not allowed. "
                "Only SELECT queries are permitted."
            ),
            error_code="BLOCKED_STATEMENT",
        )

    # Also catch blocked keywords in case of nested / unusual AST shapes
    sql_upper = sql.upper()
    for keyword in BLOCKED_NAMES:
        # Simple word-boundary check to avoid false positives on column names
        import re
        if re.search(rf"\b{keyword}\b", sql_upper):
            return ValidationResult(
                valid=False,
                sql=sql,
                error=(
                    f"🚫 {keyword} statements are not allowed. "
                    "Only SELECT queries are permitted."
                ),
                error_code="BLOCKED_STATEMENT",
            )

    # ── 3. Table scope check ─────────────────────────────────────────────────
    valid_tables = set(get_valid_tables(dataset))
    referenced_tables = {
        table.name.lower()
        for table in parsed.find_all(exp.Table)
        if table.name  # skip CTEs with no name
    }

    out_of_scope = referenced_tables - {t.lower() for t in valid_tables}
    if out_of_scope:
        return ValidationResult(
            valid=False,
            sql=sql,
            error=(
                f"🚫 Query references unknown table(s): {', '.join(sorted(out_of_scope))}. "
                f"Available tables for '{dataset}': {', '.join(sorted(valid_tables))}."
            ),
            error_code="INVALID_TABLE",
        )

    # ── 4. LIMIT enforcer ────────────────────────────────────────────────────
    has_limit = parsed.find(exp.Limit) is not None
    if not has_limit:
        parsed = parsed.limit(MAX_ROWS)
        sql = parsed.sql(dialect="duckdb")

    return ValidationResult(valid=True, sql=sql, error=None, error_code=None)
