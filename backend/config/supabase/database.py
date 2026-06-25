import os

from dotenv import load_dotenv

load_dotenv()


def get_database_url() -> str:
    database_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "Missing SUPABASE_DATABASE_URL. Set it to your Supabase Postgres connection string."
        )
    return database_url
