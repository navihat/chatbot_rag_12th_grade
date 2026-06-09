import os
import sqlite3
import json
from datetime import datetime, timezone

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "database.db")

def get_db_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    # Create chats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,
            quiz TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    """)

    # Create active_diagnostic_quizzes table (temporary storage of generated answers)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS active_diagnostic_quizzes (
            email TEXT PRIMARY KEY,
            questions_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    """)

    # Create chapter_mastery table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chapter_mastery (
            email TEXT NOT NULL,
            chapter TEXT NOT NULL,
            mastery_score REAL DEFAULT 0.0,
            status TEXT DEFAULT 'Novice',
            highest_mastery_score REAL DEFAULT 0.0,
            highest_status TEXT DEFAULT 'Novice',
            updated_at TEXT NOT NULL,
            PRIMARY KEY (email, chapter),
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    """)

    # Auto-migration: check and add columns if they do not exist
    cursor.execute("PRAGMA table_info(chapter_mastery)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "highest_mastery_score" not in columns:
        cursor.execute("ALTER TABLE chapter_mastery ADD COLUMN highest_mastery_score REAL DEFAULT 0.0")
    if "highest_status" not in columns:
        cursor.execute("ALTER TABLE chapter_mastery ADD COLUMN highest_status TEXT DEFAULT 'Novice'")

    # Create chapter_assessment_details table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chapter_assessment_details (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            chapter TEXT NOT NULL,
            level INTEGER NOT NULL,
            correct INTEGER NOT NULL,
            response_time REAL NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    """)
    
    # Create diagnostic_results table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS diagnostic_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            score REAL NOT NULL,
            competence TEXT NOT NULL,
            details TEXT NOT NULL, -- JSON serialized list of [{chapter, level, correct}]
            created_at TEXT NOT NULL,
            FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()

def create_user(email: str, password_hash: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
            (email.strip().lower(), password_hash, now)
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_user(email: str) -> dict | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def save_chat_message(email: str, role: str, content: str, sources: list = None, quiz: dict = None) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now(timezone.utc).isoformat()
        sources_str = json.dumps(sources, ensure_ascii=False) if sources else None
        quiz_str = json.dumps(quiz, ensure_ascii=False) if quiz else None
        
        cursor.execute(
            "INSERT INTO chats (email, role, content, sources, quiz, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (email.strip().lower(), role, content, sources_str, quiz_str, now)
        )
        conn.commit()
    finally:
        conn.close()

def get_chat_history(email: str) -> list[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role, content, sources, quiz FROM chats WHERE email = ? ORDER BY id ASC",
        (email.strip().lower(),)
    )
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for r in rows:
        msg = {
            "role": r["role"],
            "content": r["content"]
        }
        if r["sources"]:
            msg["sources"] = json.loads(r["sources"])
        if r["quiz"]:
            msg["quiz"] = json.loads(r["quiz"])
        history.append(msg)
        
    return history

def clear_chat_history(email: str) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chats WHERE email = ?", (email.strip().lower(),))
    conn.commit()
    conn.close()

def save_active_diagnostic(email: str, questions_json: str) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT OR REPLACE INTO active_diagnostic_quizzes (email, questions_json, created_at) VALUES (?, ?, ?)",
            (email.strip().lower(), questions_json, now)
        )
        conn.commit()
    finally:
        conn.close()

def get_active_diagnostic(email: str) -> str | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT questions_json FROM active_diagnostic_quizzes WHERE email = ?", (email.strip().lower(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return row["questions_json"]
    return None

def save_chapter_mastery(email: str, chapter: str, score: float, status: str) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        # Check if record already exists to compare scores
        cursor.execute(
            "SELECT highest_mastery_score, highest_status FROM chapter_mastery WHERE email = ? AND chapter = ?",
            (email.strip().lower(), chapter.strip())
        )
        row = cursor.fetchone()
        
        if row:
            existing_highest = row["highest_mastery_score"]
            existing_highest_status = row["highest_status"]
            
            # Determine new highest score and status
            if score >= existing_highest:
                highest_score = score
                highest_status = status
            else:
                highest_score = existing_highest
                highest_status = existing_highest_status
                
            cursor.execute(
                "UPDATE chapter_mastery SET mastery_score = ?, status = ?, highest_mastery_score = ?, highest_status = ?, updated_at = ? WHERE email = ? AND chapter = ?",
                (score, status, highest_score, highest_status, now, email.strip().lower(), chapter.strip())
            )
        else:
            cursor.execute(
                "INSERT INTO chapter_mastery (email, chapter, mastery_score, status, highest_mastery_score, highest_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (email.strip().lower(), chapter.strip(), score, status, score, status, now)
            )
            
        conn.commit()
    finally:
        conn.close()

def get_all_chapter_mastery(email: str) -> list[dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT chapter, mastery_score, status, highest_mastery_score, highest_status, updated_at FROM chapter_mastery WHERE email = ?", (email.strip().lower(),))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def save_assessment_detail(email: str, chapter: str, level: int, correct: int, response_time: float) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT INTO chapter_assessment_details (email, chapter, level, correct, response_time, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (email.strip().lower(), chapter.strip(), level, correct, response_time, now)
        )
        conn.commit()
    finally:
        conn.close()

def save_diagnostic_result(email: str, score: float, competence: str, details: list) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now(timezone.utc).isoformat()
        details_str = json.dumps(details, ensure_ascii=False)
        cursor.execute(
            "INSERT INTO diagnostic_results (email, score, competence, details, created_at) VALUES (?, ?, ?, ?, ?)",
            (email.strip().lower(), score, competence, details_str, now)
        )
        conn.commit()
    finally:
        conn.close()

def get_latest_diagnostic_result(email: str) -> dict | None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT score, competence, details, created_at FROM diagnostic_results WHERE email = ? ORDER BY id DESC LIMIT 1",
        (email.strip().lower(),)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        res = dict(row)
        res["details"] = json.loads(res["details"])
        return res
    return None

def clear_diagnostic_results(email: str) -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM diagnostic_results WHERE email = ?", (email.strip().lower(),))
    conn.commit()
    conn.close()
