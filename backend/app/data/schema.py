"""
SchemaInspector — extracts table structure and sample rows, then renders
them as a plain-text string that gets injected into every LLM prompt.

Schema is cached in memory after the first successful load so the remote
Parquet/CSV URL is only fetched once per server session.
"""

from __future__ import annotations
import json
from dataclasses import dataclass, field
from .loader import get_connection, ensure_loaded, DATASET_VIEWS


@dataclass
class ColumnInfo:
    name: str
    type: str


@dataclass
class TableInfo:
    name: str
    columns: list[ColumnInfo] = field(default_factory=list)
    sample_rows: list[dict] = field(default_factory=list)


# In-memory cache: populated on first inspect() call per dataset
_schema_cache: dict[str, list[TableInfo]] = {}
_context_cache: dict[str, str] = {}


def inspect(dataset: str) -> list[TableInfo]:
    """Return full schema + 3 sample rows for every table in the dataset.
    Result is cached — remote file is only fetched once per server session."""
    if dataset in _schema_cache:
        return _schema_cache[dataset]

    ensure_loaded(dataset)
    conn = get_connection()
    result: list[TableInfo] = []

    for view_name in DATASET_VIEWS[dataset]:
        # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        cols_raw = conn.execute(f"PRAGMA table_info('{view_name}')").fetchall()
        columns = [ColumnInfo(name=row[1], type=row[2]) for row in cols_raw]

        rows_df = conn.execute(f"SELECT * FROM {view_name} LIMIT 3").fetchdf()
        # Round-trip through JSON to convert NaN/Inf → null (pandas NaN isn't JSON-safe)
        sample_rows = json.loads(rows_df.to_json(orient="records"))

        result.append(TableInfo(name=view_name, columns=columns, sample_rows=sample_rows))

    _schema_cache[dataset] = result
    return result


def schema_to_prompt_context(dataset: str) -> str:
    """
    Render schema + samples as a compact string for LLM injection.
    Cached after first call — no repeated remote fetches.
    """
    if dataset in _context_cache:
        return _context_cache[dataset]

    tables = inspect(dataset)
    parts: list[str] = []

    for t in tables:
        col_str = ", ".join(f"{c.name} ({c.type})" for c in t.columns)
        sample_str = json.dumps(t.sample_rows[:2], default=str, indent=2)
        parts.append(
            f"Table: {t.name}\n"
            f"Columns: {col_str}\n"
            f"Sample rows (first 2):\n{sample_str}"
        )

    context = "\n\n---\n\n".join(parts)
    _context_cache[dataset] = context
    return context


def get_valid_tables(dataset: str) -> list[str]:
    """Return the list of allowed table names for a dataset (used by guardrails)."""
    return DATASET_VIEWS.get(dataset, [])
