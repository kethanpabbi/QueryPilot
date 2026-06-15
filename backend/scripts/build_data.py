"""
Build script — downloads source data and writes parquet files to data_cache/.

Run this once locally or as a Railway build command:
    python scripts/build_data.py

Requirements: pandas, pyarrow, requests (or curl available on PATH).
"""

import io
import os
import sqlite3
import subprocess
import sys
import gzip

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "data_cache")
os.makedirs(CACHE, exist_ok=True)


def download(url: str, dest: str) -> None:
    print(f"  downloading {os.path.basename(dest)} ...", end=" ", flush=True)
    subprocess.run(["curl", "-L", "--silent", "--fail", "-o", dest, url], check=True)
    print(f"{os.path.getsize(dest) // 1024} KB")


# ── Chinook ──────────────────────────────────────────────────────────────────

CHINOOK_URL = (
    "https://github.com/lerocha/chinook-database/raw/master/"
    "ChinookDatabase/DataSources/Chinook_Sqlite.sqlite"
)
CHINOOK_TABLES = [
    "Album", "Artist", "Customer", "Employee", "Genre",
    "Invoice", "InvoiceLine", "MediaType", "Playlist", "PlaylistTrack", "Track",
]

def build_chinook():
    print("Building Chinook...")
    sqlite_path = os.path.join(CACHE, "chinook.sqlite")
    if not os.path.exists(sqlite_path):
        download(CHINOOK_URL, sqlite_path)
    conn = sqlite3.connect(sqlite_path)
    for t in CHINOOK_TABLES:
        df = pd.read_sql(f'SELECT * FROM "{t}"', conn)
        out = os.path.join(CACHE, f"chinook_{t.lower()}.parquet")
        df.to_parquet(out, index=False)
        print(f"  {t.lower()}: {len(df)} rows")
    conn.close()
    print("Chinook done.\n")


# ── IMDB ─────────────────────────────────────────────────────────────────────

IMDB_RATINGS_URL = "https://datasets.imdbws.com/title.ratings.tsv.gz"
IMDB_BASICS_URL  = "https://datasets.imdbws.com/title.basics.tsv.gz"


def build_imdb():
    print("Building IMDB...")
    ratings_path = os.path.join(CACHE, "title.ratings.tsv.gz")
    basics_path  = os.path.join(CACHE, "title.basics.tsv.gz")

    if not os.path.exists(ratings_path):
        download(IMDB_RATINGS_URL, ratings_path)
    if not os.path.exists(basics_path):
        download(IMDB_BASICS_URL, basics_path)

    ratings_df = pd.read_csv(
        ratings_path, sep="\t", compression="gzip", dtype={"tconst": str}
    )

    # Read basics — tolerate truncated gzip from a partial download
    good_lines = []
    with open(basics_path, "rb") as f:
        with gzip.GzipFile(fileobj=f) as g:
            try:
                for line in g:
                    good_lines.append(line)
            except Exception:
                pass
    basics_df = pd.read_csv(
        io.BytesIO(b"".join(good_lines)), sep="\t", na_values=["\\N"],
        usecols=["tconst", "titleType", "primaryTitle",
                 "startYear", "runtimeMinutes", "genres"],
        low_memory=False,
    )

    movies_df = basics_df[basics_df["titleType"] == "movie"].drop(
        columns=["titleType"]
    ).copy()

    movie_df = (
        movies_df.merge(ratings_df, on="tconst", how="inner")
        .nlargest(20_000, "numVotes")
        .reset_index(drop=True)
    )

    movie_df.to_parquet(os.path.join(CACHE, "imdb_movie.parquet"), index=False)
    print(f"  movie: {len(movie_df)} rows")

    genre_rows = []
    for row in movie_df[["tconst", "primaryTitle", "genres"]].itertuples(index=False):
        if row.genres and pd.notna(row.genres):
            for g in str(row.genres).split(","):
                genre_rows.append({
                    "tconst": row.tconst,
                    "primaryTitle": row.primaryTitle,
                    "genre": g.strip(),
                })
    genre_df = pd.DataFrame(genre_rows)
    genre_df.to_parquet(os.path.join(CACHE, "imdb_genre.parquet"), index=False)
    print(f"  genre: {len(genre_df)} rows")
    print("IMDB done.\n")


if __name__ == "__main__":
    build_chinook()
    build_imdb()
    print("All datasets ready in", CACHE)
