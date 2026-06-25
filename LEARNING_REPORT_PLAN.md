# Learning Report Feature Plan

## Goal

Add a learning report page where an authenticated user can review stored assessment results, see an LLM-written learning report, and start targeted practice based on that report.

The feature will reuse the assessment data produced by `backend/services/assessment.py` and persisted through `backend/services/db.py`.

## Current Starting Point

- Frontend uses Next.js App Router under `frontend/app`.
- Assessment UI currently lives in `frontend/components/DiagnosticView.tsx`.
- Frontend API helpers live in `frontend/lib/api.ts`.
- Backend FastAPI routers live under `backend/routers`.
- Assessment logic lives in `backend/services/assessment.py`.
- Assessment persistence currently includes:
  - `chapter_mastery`
  - `chapter_assessment_details`
  - `active_diagnostic_quizzes`
  - `diagnostic_results`

## Proposed User Flow

1. User logs in.
2. User opens a new frontend page, for example `/report`.
3. Page fetches the user's learning report from the backend.
4. Backend reads stored mastery and assessment detail rows from Supabase/Postgres.
5. Backend returns:
   - chapter-level mastery summary
   - recent assessment performance
   - weak chapters or weak levels
   - LLM-generated written feedback
   - recommended practice prompts
6. User clicks a practice action from the report.
7. Frontend sends the selected recommendation to a backend practice endpoint.
8. Backend uses the report context plus SGK retrieval to generate targeted practice.
9. User practices based on weaknesses found in the report.

## Backend Plan

### 1. Add Database Read Helpers

File: `backend/services/db.py`

Add functions such as:

```python
def get_chapter_assessment_details(email: str) -> list[dict]:
    ...

def get_recent_assessment_details(email: str, limit: int = 50) -> list[dict]:
    ...

def get_learning_report_source_data(email: str) -> dict:
    ...
```

The source data should include:

- all rows from `chapter_mastery`
- recent rows from `chapter_assessment_details`
- optionally latest diagnostic result rows if still useful

### 2. Add Learning Report Service

New file: `backend/services/learning_report.py`

Responsibilities:

- Load assessment data for the current user.
- Aggregate learning metrics:
  - average mastery score
  - weakest chapters
  - strongest chapters
  - low-performing cognitive levels
  - recent trend if enough data exists
- Ask the LLM to write a concise Vietnamese learning report.
- Return structured JSON to the frontend.

Suggested response shape:

```json
{
  "summary": {
    "average_mastery": 62.5,
    "strongest_chapters": [],
    "weakest_chapters": [],
    "total_attempts": 24
  },
  "level_breakdown": [
    {"level": 1, "label": "Nhận biết", "accuracy": 0.75},
    {"level": 2, "label": "Thông hiểu", "accuracy": 0.55},
    {"level": 3, "label": "Vận dụng", "accuracy": 0.32}
  ],
  "llm_report": "...",
  "practice_recommendations": [
    {
      "id": "chapter-1-level-2",
      "chapter": "Chương 1: Este - Lipit",
      "level": 2,
      "title": "Ôn lại tính chất este",
      "prompt": "Tạo bài luyện tập..."
    }
  ]
}
```

### 3. Add Backend Router

New file: `backend/routers/learning_report.py`

Endpoints:

```text
GET /learning-report
POST /learning-report/practice
```

`GET /learning-report`

- Requires JWT through `get_current_user`.
- Calls `services.learning_report.generate_learning_report(email)`.
- Returns structured report JSON.

`POST /learning-report/practice`

- Requires JWT.
- Accepts selected recommendation or custom practice prompt.
- Uses stored report context and retrieval to generate targeted practice.
- Can return either:
  - quiz JSON, similar to `/quiz`
  - or a chat-style explanation/practice plan

Recommended first implementation: return quiz JSON, because the frontend already has quiz display patterns.

### 4. Register Router

File: `backend/main.py`

Import and include the new router:

```python
from routers import auth, chat, quiz, assessment, learning_report

app.include_router(learning_report.router)
```

### 5. LLM Prompting

The report LLM prompt should be strict:

- Vietnamese output.
- Focus on learning diagnosis, not generic encouragement.
- Use only stored assessment data.
- Return JSON for recommendations.
- Keep the written report short enough for frontend display.

The practice LLM prompt should include:

- weak chapter
- weak level
- recent mistakes if available
- SGK context from retriever
- required output schema

## Frontend Plan

### 1. Add API Helpers

File: `frontend/lib/api.ts`

Add:

```ts
export async function getLearningReport(): Promise<LearningReport> {
  ...
}

export async function generateReportPractice(request: ReportPracticeRequest): Promise<Quiz> {
  ...
}
```

Define TypeScript interfaces:

```ts
export interface LearningReport {
  summary: LearningReportSummary;
  level_breakdown: LevelBreakdown[];
  llm_report: string;
  practice_recommendations: PracticeRecommendation[];
}
```

### 2. Add New Page

New file:

```text
frontend/app/report/page.tsx
```

Page responsibilities:

- Require client-side auth token.
- Fetch `/learning-report`.
- Show loading, empty, error, and report states.
- Display:
  - average mastery
  - strongest/weakest chapters
  - level breakdown
  - LLM-written learning report
  - recommended practice actions

### 3. Add Report Components

Optional new components:

```text
frontend/components/LearningReportView.tsx
frontend/components/PracticeRecommendationCard.tsx
```

Keep the UI consistent with the existing dashboard style, but make it report-oriented:

- compact metrics
- clear weak/strong sections
- visible practice buttons
- no marketing-style landing section

### 4. Navigation Entry

Update the main app navigation or dashboard entry point so users can reach `/report`.

Likely files to inspect before implementation:

- `frontend/app/page.tsx`
- `frontend/components/ChatWindow.tsx`
- any layout/navigation controls in current UI

## Practice From Report

Recommended initial behavior:

1. User clicks a recommendation button.
2. Frontend calls:

```text
POST /learning-report/practice
```

3. Backend generates a focused quiz.
4. Frontend displays the quiz using an existing quiz card or a new compact practice view.

Later enhancement:

- Save report-generated practice attempts back to the database.
- Feed those attempts into future reports.

## Database Changes

Initial version can avoid schema changes by reading existing tables.

Optional later table:

```sql
CREATE TABLE IF NOT EXISTS learning_reports (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    report JSONB NOT NULL,
    created_at TEXT NOT NULL
);
```

Use this only if report generation is slow or expensive and caching becomes necessary.

## Error Handling

Backend should return clear FastAPI errors:

- `404` or empty report state if the user has no assessment data.
- `500` with a safe message if LLM generation fails.
- Never expose raw API keys, stack traces, or database connection strings.

Frontend should show:

- empty state: user has not completed any assessment yet
- retry action
- direct link/button to start assessment

## Implementation Order

1. Add DB read helpers in `backend/services/db.py`.
2. Add `backend/services/learning_report.py`.
3. Add `backend/routers/learning_report.py`.
4. Register router in `backend/main.py`.
5. Add frontend API types and helpers in `frontend/lib/api.ts`.
6. Add `/report` page.
7. Add navigation entry to the report page.
8. Add report practice flow.
9. Run backend import/syntax checks.
10. Run frontend build.
11. Deploy backend and frontend.

## Verification Checklist

- User with no assessments sees an empty report state.
- User with completed assessments sees mastery summary.
- LLM report is generated in Vietnamese.
- Practice recommendation button calls backend successfully.
- Practice content is related to weak chapter/level.
- Existing chat, quiz, login, register, and assessment flows still work.
- Frontend build passes.
- Backend starts on Render without loading heavy vector dependencies unless explicitly configured.

