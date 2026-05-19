"""
DuckDB connection manager and dataset loader.

Datasets are registered as lazy views — DuckDB reads remote files
only when a query executes, so startup is instant.
"""

import duckdb

_conn: duckdb.DuckDBPyConnection | None = None

# Public Parquet / CSV sources
NYC_TAXI_URL = (
    "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2024-01.parquet"
)
ECOMMERCE_URL = (
    "https://raw.githubusercontent.com/datasets/e-commerce-transactions/main/data/transactions.csv"
)

# Which view names belong to each dataset key
DATASET_VIEWS: dict[str, list[str]] = {
    "nyc_taxi": ["nyc_taxi"],
    "ecommerce": ["orders"],
}


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return the shared in-process DuckDB connection, creating it once."""
    global _conn
    if _conn is None:
        _conn = duckdb.connect(":memory:")
        # httpfs lets DuckDB fetch remote Parquet/CSV without downloading to disk
        _conn.execute("INSTALL httpfs; LOAD httpfs;")
    return _conn


def load_dataset(dataset: str) -> None:
    """Register dataset views. Safe to call multiple times (uses CREATE OR REPLACE)."""
    conn = get_connection()

    if dataset == "nyc_taxi":
        conn.execute(f"""
            CREATE OR REPLACE VIEW nyc_taxi AS
            SELECT * FROM read_parquet('{NYC_TAXI_URL}')
        """)

    elif dataset == "ecommerce":
        conn.execute(f"""
            CREATE OR REPLACE VIEW orders AS
            SELECT * FROM read_csv_auto('{ECOMMERCE_URL}', header=True)
        """)

    else:
        raise ValueError(f"Unknown dataset: '{dataset}'. Choose 'nyc_taxi' or 'ecommerce'.")


def ensure_loaded(dataset: str) -> None:
    """Load the dataset only if its primary view doesn't exist yet."""
    conn = get_connection()
    primary_view = DATASET_VIEWS[dataset][0]
    exists = conn.execute(
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?",
        [primary_view],
    ).fetchone()[0]

    if not exists:
        load_dataset(dataset)
