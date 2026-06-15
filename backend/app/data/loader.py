"""
DuckDB connection manager and dataset loader.

Chinook: downloads the official SQLite file via urllib, reads each table
with Python's built-in sqlite3 module (no DuckDB extension required),
and materialises the data into DuckDB via pandas. The temp file is
deleted immediately after loading.

E-commerce: single remote CSV registered as a lazy DuckDB view via httpfs.
"""

import os
import sqlite3
import tempfile
import urllib.request

import duckdb
import pandas as pd

_conn: duckdb.DuckDBPyConnection | None = None

CHINOOK_SQLITE_URL = (
    "https://github.com/lerocha/chinook-database/raw/master/"
    "ChinookDatabase/DataSources/Chinook_Sqlite.sqlite"
)

ECOMMERCE_URL = (
    "https://raw.githubusercontent.com/datasets/e-commerce-transactions/"
    "main/data/transactions.csv"
)

# Exact table names as they appear in the Chinook SQLite schema
CHINOOK_TABLES: list[str] = [
    "Album", "Artist", "Customer", "Employee", "Genre",
    "Invoice", "InvoiceLine", "MediaType", "Playlist",
    "PlaylistTrack", "Track",
]

# Which table/view names belong to each dataset key (lowercase)
DATASET_VIEWS: dict[str, list[str]] = {
    "chinook": [t.lower() for t in CHINOOK_TABLES],
    "ecommerce": ["orders"],
}


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return the shared in-process DuckDB connection, creating it once."""
    global _conn
    if _conn is None:
        _conn = duckdb.connect(":memory:")
        _conn.execute("INSTALL httpfs; LOAD httpfs;")
    return _conn


def load_dataset(dataset: str) -> None:
    """Register dataset tables/views. Safe to call multiple times."""
    conn = get_connection()

    if dataset == "chinook":
        tmp = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
        tmp.close()
        try:
            urllib.request.urlretrieve(CHINOOK_SQLITE_URL, tmp.name)
            sqlite_conn = sqlite3.connect(tmp.name)
            for table in CHINOOK_TABLES:
                df: pd.DataFrame = pd.read_sql(f'SELECT * FROM "{table}"', sqlite_conn)
                # Register the DataFrame, then materialise as a permanent table
                conn.register(f"_tmp_{table}", df)
                conn.execute(
                    f'CREATE OR REPLACE TABLE {table.lower()} AS '
                    f'SELECT * FROM "_tmp_{table}"'
                )
                conn.unregister(f"_tmp_{table}")
            sqlite_conn.close()
        finally:
            os.unlink(tmp.name)

    elif dataset == "ecommerce":
        conn.execute(
            f"CREATE OR REPLACE VIEW orders AS "
            f"SELECT * FROM read_csv_auto('{ECOMMERCE_URL}', header=True)"
        )

    else:
        raise ValueError(f"Unknown dataset: '{dataset}'. Choose 'chinook' or 'ecommerce'.")


def ensure_loaded(dataset: str) -> None:
    """Load the dataset only if its primary table/view doesn't exist yet."""
    conn = get_connection()
    primary = DATASET_VIEWS[dataset][0]
    exists = conn.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
        [primary],
    ).fetchone()[0]

    if not exists:
        load_dataset(dataset)
