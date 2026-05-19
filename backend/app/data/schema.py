"""
SchemaInspector — extracts table structure and sample rows, then renders
them as a plain-text string that gets injected into every LLM prompt.
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


def inspect(dataset: str) -> list[TableInfo]:
    """Return full schema + 3 sample rows for every table in the dataset."""
    ensure_loaded(dataset)
    conn = get_connection()
    result: list[TableInfo] = []

    for view_name in DATASET_VIEWS[dataset]:
        # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
        cols_raw = conn.execute(f"PRAGMA table_info('{view_name}')").fetchall()
        columns = [ColumnInfo(name=row[1], type=row[2]) for row in cols_raw]

        rows_df = conn.execute(f"SELECT * FROM {view_name} LIMIT 3").fetchdf()
        sample_rows = rows_df.to_dict(orient="records")

        result.append(TableInfo(name=view_name, columns=columns, sample_rows=sample_rows))

    return result


def schema_to_prompt_context(dataset: str) -> str:
    """
    Render schema + samples as a compact string for LLM injection.

    Example output:
        Table: nyc_taxi
        Columns: VendorID (BIGINT), tpep_pickup_datetime (TIMESTAMP), ...
        Sample rows (first 2):
        [{"VendorID": 1, ...}, ...]
    """
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

    return "\n\n---\n\n".join(parts)


def get_valid_tables(dataset: str) -> list[str]:
    """Return the list of allowed table names for a dataset (used by guardrails)."""
    return DATASET_VIEWS.get(dataset, [])
