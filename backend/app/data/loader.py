"""
DuckDB connection manager and dataset loader.

Chinook is loaded by downloading the official SQLite file, materialising
every table into DuckDB memory, then discarding the temp file.
E-commerce is a single remote CSV registered as a lazy view.
"""

import os
import tempfile
import urllib.request
import duckdb

_conn: duckdb.DuckDBPyConnection | None = None

CHINOOK_SQLITE_URL = (
    "https://github.com/lerocha/chinook-database/raw/master/"
    "ChinookDatabase/DataSources/Chinook_Sqlite.sqlite"
)

ECOMMERCE_URL = (
    "https://raw.githubusercontent.com/datasets/e-commerce-transactions/"
    "main/data/transactions.csv"
)

# SQLite table name → lowercase DuckDB table name
CHINOOK_TABLE_MAP: dict[str, str] = {
    "Album": "album",
    "Artist": "artist",
    "Customer": "customer",
    "Employee": "employee",
    "Genre": "genre",
    "Invoice": "invoice",
    "InvoiceLine": "invoiceline",
    "MediaType": "mediatype",
    "Playlist": "playlist",
    "PlaylistTrack": "playlisttrack",
    "Track": "track",
}

# Which table/view names belong to each dataset key
DATASET_VIEWS: dict[str, list[str]] = {
    "chinook": list(CHINOOK_TABLE_MAP.values()),
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
        # Download the SQLite file, materialise each table into DuckDB, clean up
        tmp = tempfile.NamedTemporaryFile(suffix=".sqlite", delete=False)
        tmp.close()
        try:
            urllib.request.urlretrieve(CHINOOK_SQLITE_URL, tmp.name)
            conn.execute("INSTALL sqlite; LOAD sqlite;")
            conn.execute(f"ATTACH '{tmp.name}' AS _chinook (TYPE sqlite, READ_ONLY)")
            for sqlite_name, duckdb_name in CHINOOK_TABLE_MAP.items():
                conn.execute(
                    f"CREATE OR REPLACE TABLE {duckdb_name} AS "
                    f"SELECT * FROM _chinook.\"{sqlite_name}\""
                )
            conn.execute("DETACH _chinook")
        finally:
            os.unlink(tmp.name)

    elif dataset == "ecommerce":
        conn.execute(f"""
            CREATE OR REPLACE VIEW orders AS
            SELECT * FROM read_csv_auto('{ECOMMERCE_URL}', header=True)
        """)

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
