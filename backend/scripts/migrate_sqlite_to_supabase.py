#!/usr/bin/env python3
import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
from psycopg.types.json import Jsonb

from services.db import get_db_connection, init_db

load_dotenv()

DEFAULT_SQLITE_PATH = Path(__file__).resolve().parent.parent / "data" / "database.db"


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row is not None


def parse_json(value: Any) -> Jsonb | None:
    if not value:
        return None
    if isinstance(value, (dict, list)):
        return Jsonb(value)
    return Jsonb(json.loads(value))


def migrate_users(sqlite_conn: sqlite3.Connection) -> int:
    if not table_exists(sqlite_conn, "users"):
        return 0
    rows = sqlite_conn.execute("SELECT email, password_hash, created_at FROM users").fetchall()
    with get_db_connection() as pg_conn:
        with pg_conn.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    """
                    INSERT INTO users (email, password_hash, created_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (email) DO UPDATE
                    SET password_hash = EXCLUDED.password_hash,
                        created_at = EXCLUDED.created_at
                    """,
                    (row["email"], row["password_hash"], row["created_at"]),
                )
        pg_conn.commit()
    return len(rows)


def migrate_chats(sqlite_conn: sqlite3.Connection) -> int:
    if not table_exists(sqlite_conn, "chats"):
        return 0
    rows = sqlite_conn.execute(
        "SELECT id, email, role, content, sources, quiz, created_at FROM chats ORDER BY id"
    ).fetchall()
    with get_db_connection() as pg_conn:
        with pg_conn.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    """
                    INSERT INTO chats (id, email, role, content, sources, quiz, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                    SET email = EXCLUDED.email,
                        role = EXCLUDED.role,
                        content = EXCLUDED.content,
                        sources = EXCLUDED.sources,
                        quiz = EXCLUDED.quiz,
                        created_at = EXCLUDED.created_at
                    """,
                    (
                        row["id"],
                        row["email"],
                        row["role"],
                        row["content"],
                        parse_json(row["sources"]),
                        parse_json(row["quiz"]),
                        row["created_at"],
                    ),
                )
            reset_sequence(cursor, "chats", "id")
        pg_conn.commit()
    return len(rows)


def migrate_active_diagnostic_quizzes(sqlite_conn: sqlite3.Connection) -> int:
    if not table_exists(sqlite_conn, "active_diagnostic_quizzes"):
        return 0
    rows = sqlite_conn.execute(
        "SELECT email, questions_json, created_at FROM active_diagnostic_quizzes"
    ).fetchall()
    with get_db_connection() as pg_conn:
        with pg_conn.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    """
                    INSERT INTO active_diagnostic_quizzes (email, questions_json, created_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (email) DO UPDATE
                    SET questions_json = EXCLUDED.questions_json,
                        created_at = EXCLUDED.created_at
                    """,
                    (row["email"], row["questions_json"], row["created_at"]),
                )
        pg_conn.commit()
    return len(rows)


def migrate_chapter_mastery(sqlite_conn: sqlite3.Connection) -> int:
    if not table_exists(sqlite_conn, "chapter_mastery"):
        return 0
    rows = sqlite_conn.execute(
        """
        SELECT email, chapter, mastery_score, status, highest_mastery_score, highest_status, updated_at
        FROM chapter_mastery
        """
    ).fetchall()
    with get_db_connection() as pg_conn:
        with pg_conn.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    """
                    INSERT INTO chapter_mastery (
                        email, chapter, mastery_score, status,
                        highest_mastery_score, highest_status, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (email, chapter) DO UPDATE
                    SET mastery_score = EXCLUDED.mastery_score,
                        status = EXCLUDED.status,
                        highest_mastery_score = EXCLUDED.highest_mastery_score,
                        highest_status = EXCLUDED.highest_status,
                        updated_at = EXCLUDED.updated_at
                    """,
                    (
                        row["email"],
                        row["chapter"],
                        row["mastery_score"],
                        row["status"],
                        row["highest_mastery_score"],
                        row["highest_status"],
                        row["updated_at"],
                    ),
                )
        pg_conn.commit()
    return len(rows)


def migrate_chapter_assessment_details(sqlite_conn: sqlite3.Connection) -> int:
    if not table_exists(sqlite_conn, "chapter_assessment_details"):
        return 0
    rows = sqlite_conn.execute(
        """
        SELECT id, email, chapter, level, correct, response_time, created_at
        FROM chapter_assessment_details
        ORDER BY id
        """
    ).fetchall()
    with get_db_connection() as pg_conn:
        with pg_conn.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    """
                    INSERT INTO chapter_assessment_details (
                        id, email, chapter, level, correct, response_time, created_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                    SET email = EXCLUDED.email,
                        chapter = EXCLUDED.chapter,
                        level = EXCLUDED.level,
                        correct = EXCLUDED.correct,
                        response_time = EXCLUDED.response_time,
                        created_at = EXCLUDED.created_at
                    """,
                    (
                        row["id"],
                        row["email"],
                        row["chapter"],
                        row["level"],
                        row["correct"],
                        row["response_time"],
                        row["created_at"],
                    ),
                )
            reset_sequence(cursor, "chapter_assessment_details", "id")
        pg_conn.commit()
    return len(rows)


def migrate_diagnostic_results(sqlite_conn: sqlite3.Connection) -> int:
    if not table_exists(sqlite_conn, "diagnostic_results"):
        return 0
    rows = sqlite_conn.execute(
        "SELECT id, email, score, competence, details, created_at FROM diagnostic_results ORDER BY id"
    ).fetchall()
    with get_db_connection() as pg_conn:
        with pg_conn.cursor() as cursor:
            for row in rows:
                cursor.execute(
                    """
                    INSERT INTO diagnostic_results (id, email, score, competence, details, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                    SET email = EXCLUDED.email,
                        score = EXCLUDED.score,
                        competence = EXCLUDED.competence,
                        details = EXCLUDED.details,
                        created_at = EXCLUDED.created_at
                    """,
                    (
                        row["id"],
                        row["email"],
                        row["score"],
                        row["competence"],
                        parse_json(row["details"]),
                        row["created_at"],
                    ),
                )
            reset_sequence(cursor, "diagnostic_results", "id")
        pg_conn.commit()
    return len(rows)


def reset_sequence(cursor, table: str, column: str) -> None:
    cursor.execute(
        """
        SELECT setval(
            pg_get_serial_sequence(%s, %s),
            COALESCE((SELECT MAX(id) FROM """ + table + """), 1),
            true
        )
        """,
        (table, column),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate local SQLite data to Supabase/Postgres.")
    parser.add_argument("--sqlite", default=str(DEFAULT_SQLITE_PATH), help="Path to SQLite database.db")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite)
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite database not found: {sqlite_path}")

    init_db()

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    try:
        counts = {
            "users": migrate_users(sqlite_conn),
            "chats": migrate_chats(sqlite_conn),
            "active_diagnostic_quizzes": migrate_active_diagnostic_quizzes(sqlite_conn),
            "chapter_mastery": migrate_chapter_mastery(sqlite_conn),
            "chapter_assessment_details": migrate_chapter_assessment_details(sqlite_conn),
            "diagnostic_results": migrate_diagnostic_results(sqlite_conn),
        }
    finally:
        sqlite_conn.close()

    print("Migration complete:")
    for table, count in counts.items():
        print(f"- {table}: {count}")


if __name__ == "__main__":
    main()
