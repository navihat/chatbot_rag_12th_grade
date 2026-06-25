import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from config.supabase.database import get_database_url

logger = logging.getLogger(__name__)

SCHEMA_PATH = Path(__file__).resolve().parent.parent / "config" / "supabase" / "schema.sql"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _email(value: str) -> str:
    return value.strip().lower()


def _chapter(value: str) -> str:
    return value.strip()


def _json_or_none(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        return json.loads(value)
    return value


def _jsonb_or_none(value: Any) -> Jsonb | None:
    return Jsonb(value) if value else None


def get_db_connection():
    return psycopg.connect(get_database_url(), row_factory=dict_row, prepare_threshold=None)


def init_db() -> None:
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(schema)
        conn.commit()
    logger.info("Supabase/Postgres database ready.")


def create_user(email: str, password_hash: str) -> bool:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (email, password_hash, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (email) DO NOTHING
                RETURNING email
                """,
                (_email(email), password_hash, _now()),
            )
            created = cursor.fetchone() is not None
        conn.commit()
        return created


def get_user(email: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM users WHERE email = %s", (_email(email),))
            return cursor.fetchone()


def save_chat_message(email: str, role: str, content: str, sources: list = None, quiz: dict = None) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO chats (email, role, content, sources, quiz, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (_email(email), role, content, _jsonb_or_none(sources), _jsonb_or_none(quiz), _now()),
            )
        conn.commit()


def get_chat_history(email: str) -> list[dict]:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT role, content, sources, quiz
                FROM chats
                WHERE email = %s
                ORDER BY id ASC
                """,
                (_email(email),),
            )
            rows = cursor.fetchall()

    history = []
    for row in rows:
        message = {"role": row["role"], "content": row["content"]}
        if row["sources"]:
            message["sources"] = _json_or_none(row["sources"])
        if row["quiz"]:
            message["quiz"] = _json_or_none(row["quiz"])
        history.append(message)
    return history


def clear_chat_history(email: str) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM chats WHERE email = %s", (_email(email),))
        conn.commit()


def save_active_diagnostic(email: str, questions_json: str) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO active_diagnostic_quizzes (email, questions_json, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (email) DO UPDATE
                SET questions_json = EXCLUDED.questions_json,
                    created_at = EXCLUDED.created_at
                """,
                (_email(email), questions_json, _now()),
            )
        conn.commit()


def get_active_diagnostic(email: str) -> str | None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT questions_json FROM active_diagnostic_quizzes WHERE email = %s",
                (_email(email),),
            )
            row = cursor.fetchone()
            return row["questions_json"] if row else None


def save_chapter_mastery(email: str, chapter: str, score: float, status: str) -> None:
    email_value = _email(email)
    chapter_value = _chapter(chapter)
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
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
                    highest_mastery_score = GREATEST(
                        chapter_mastery.highest_mastery_score,
                        EXCLUDED.mastery_score
                    ),
                    highest_status = CASE
                        WHEN EXCLUDED.mastery_score >= chapter_mastery.highest_mastery_score
                        THEN EXCLUDED.status
                        ELSE chapter_mastery.highest_status
                    END,
                    updated_at = EXCLUDED.updated_at
                """,
                (email_value, chapter_value, score, status, score, status, _now()),
            )
        conn.commit()


def get_all_chapter_mastery(email: str) -> list[dict]:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT chapter, mastery_score, status, highest_mastery_score, highest_status, updated_at
                FROM chapter_mastery
                WHERE email = %s
                ORDER BY chapter ASC
                """,
                (_email(email),),
            )
            return cursor.fetchall()


def get_recent_assessment_details(email: str, limit: int = 100) -> list[dict]:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT chapter, level, correct, response_time, created_at
                FROM chapter_assessment_details
                WHERE email = %s
                ORDER BY id DESC
                LIMIT %s
                """,
                (_email(email), limit),
            )
            return cursor.fetchall()


def get_learning_report_source_data(email: str) -> dict:
    return {
        "mastery": get_all_chapter_mastery(email),
        "assessment_details": get_recent_assessment_details(email),
    }


def save_assessment_detail(email: str, chapter: str, level: int, correct: int, response_time: float) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO chapter_assessment_details (
                    email, chapter, level, correct, response_time, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (_email(email), _chapter(chapter), level, correct, response_time, _now()),
            )
        conn.commit()


def save_diagnostic_result(email: str, score: float, competence: str, details: list) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO diagnostic_results (email, score, competence, details, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (_email(email), score, competence, Jsonb(details), _now()),
            )
        conn.commit()


def get_latest_diagnostic_result(email: str) -> dict | None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT score, competence, details, created_at
                FROM diagnostic_results
                WHERE email = %s
                ORDER BY id DESC
                LIMIT 1
                """,
                (_email(email),),
            )
            row = cursor.fetchone()

    if not row:
        return None
    row["details"] = _json_or_none(row["details"])
    return row


def clear_diagnostic_results(email: str) -> None:
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM diagnostic_results WHERE email = %s", (_email(email),))
        conn.commit()
