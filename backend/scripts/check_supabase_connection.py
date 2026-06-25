#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

from config.supabase.database import get_database_url
from services.db import get_db_connection, init_db

load_dotenv()


def main() -> None:
    database_url = get_database_url()
    redacted_url = database_url.split("@", 1)[-1] if "@" in database_url else database_url
    print(f"Using Supabase database host: {redacted_url}")

    init_db()

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT current_database() AS database, current_user AS user")
            identity = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) AS count FROM users")
            users = cursor.fetchone()
            cursor.execute("SELECT COUNT(*) AS count FROM chats")
            chats = cursor.fetchone()

    print("Connection OK")
    print(f"Database: {identity['database']}")
    print(f"User: {identity['user']}")
    print(f"Users: {users['count']}")
    print(f"Chats: {chats['count']}")


if __name__ == "__main__":
    main()
