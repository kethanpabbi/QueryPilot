"""
DuckDB connection manager and dataset loader.

All dataset tables are pre-built as parquet files in backend/data_cache/
and loaded into an in-memory DuckDB on first access. No network calls at
runtime — fast startup, reproducible across environments.

To regenerate the parquet files (e.g. after a data refresh):
    python scripts/build_data.py
"""

import os
import threading

import duckdb

db_lock = threading.Lock()  # exported — all DuckDB callers must hold this

_conn: duckdb.DuckDBPyConnection | None = None

# Resolve data_cache relative to this file's location
_DATA_CACHE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data_cache")
)

CHINOOK_TABLES: list[str] = [
    "album", "artist", "customer", "employee", "genre",
    "invoice", "invoiceline", "mediatype", "playlist",
    "playlisttrack", "track",
]

DATASET_VIEWS: dict[str, list[str]] = {
    "chinook": CHINOOK_TABLES,
    "imdb":    ["movie", "genre"],
}


def get_connection() -> duckdb.DuckDBPyConnection:
    global _conn
    if _conn is None:
        _conn = duckdb.connect(":memory:")
    return _conn


def _parquet(filename: str) -> str:
    return os.path.join(_DATA_CACHE, filename)


def load_dataset(dataset: str) -> None:
    conn = get_connection()

    if dataset == "chinook":
        for table in CHINOOK_TABLES:
            path = _parquet(f"chinook_{table}.parquet")
            conn.execute(
                f"CREATE OR REPLACE TABLE {table} AS "
                f"SELECT * FROM read_parquet('{path}')"
            )

    elif dataset == "imdb":
        for table in ("movie", "genre"):
            path = _parquet(f"imdb_{table}.parquet")
            conn.execute(
                f"CREATE OR REPLACE TABLE {table} AS "
                f"SELECT * FROM read_parquet('{path}')"
            )

    else:
        raise ValueError(f"Unknown dataset: '{dataset}'. Choose 'chinook' or 'imdb'.")


def ensure_loaded(dataset: str) -> None:
    """Load the dataset only if its primary table doesn't exist yet."""
    with db_lock:
        conn = get_connection()
        primary = DATASET_VIEWS[dataset][0]
        try:
            conn.execute(f"SELECT 1 FROM {primary} LIMIT 0")
        except Exception:
            load_dataset(dataset)
