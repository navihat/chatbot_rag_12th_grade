CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    quiz JSONB,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chats_email_id ON chats(email, id);

CREATE TABLE IF NOT EXISTS active_diagnostic_quizzes (
    email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    questions_json TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapter_mastery (
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    chapter TEXT NOT NULL,
    mastery_score DOUBLE PRECISION DEFAULT 0.0,
    status TEXT DEFAULT 'Novice',
    highest_mastery_score DOUBLE PRECISION DEFAULT 0.0,
    highest_status TEXT DEFAULT 'Novice',
    updated_at TEXT NOT NULL,
    PRIMARY KEY (email, chapter)
);

CREATE TABLE IF NOT EXISTS chapter_assessment_details (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    chapter TEXT NOT NULL,
    level INTEGER NOT NULL,
    correct INTEGER NOT NULL,
    response_time DOUBLE PRECISION NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chapter_assessment_details_email
    ON chapter_assessment_details(email);

CREATE TABLE IF NOT EXISTS diagnostic_results (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    score DOUBLE PRECISION NOT NULL,
    competence TEXT NOT NULL,
    details JSONB NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_diagnostic_results_email_id
    ON diagnostic_results(email, id DESC);
