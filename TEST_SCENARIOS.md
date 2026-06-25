# Test Scenarios

## 1. Auth

### Register

- Open the deployed frontend.
- Register a new email with a password of at least 6 characters.
- Expected:
  - User is redirected to the dashboard.
  - Token is saved in local storage.

### Login

- Log out.
- Log in again with the same account.
- Expected:
  - User enters the dashboard.
  - User is not redirected back to `/login`.

### Invalid Login

- Enter the correct email with a wrong password.
- Expected:
  - Error message is shown.
  - User stays on the login page.

## 2. Chat RAG

### Normal Chat

- Send:

```text
Este là gì?
```

- Expected:
  - Assistant returns an answer.
  - No backend connection error is shown.
  - Render logs show a request to `/chat`.

### Context-Based Question

- Send:

```text
Tính chất hóa học của este
```

- Expected:
  - Answer is related to Chemistry 12 content.
  - Source display, if present, does not crash.

## 3. Quiz From Chat

- Send:

```text
Tạo 4 câu hỏi trắc nghiệm về este
```

- Expected:
  - Quiz is displayed.
  - User can choose answers.
  - User can view the quiz result.

## 4. Mastery Assessment

### Load Mastery Dashboard

- Click `Đánh Giá Năng Lực`.
- Expected:
  - Chapter list is shown.
  - Existing mastery data or default values are displayed.

### Generate Assessment

- Click `Đánh giá` for `Chương 1: Este - Lipit`.
- Expected:
  - Assessment questions are displayed.
  - No API error is shown.
  - Render logs show a request to `/assessment/chapter/questions`.

### Submit Assessment

- Answer all questions.
- Submit the assessment.
- Expected:
  - Score and status are displayed.
  - Mastery dashboard updates after returning.
  - Render logs show a request to `/assessment/chapter/submit`.

## 5. Learning Report

### Report With Existing Assessment Data

- Open `/report` or click `Báo cáo`.
- Expected:
  - Average mastery is displayed.
  - LLM report or fallback report is displayed.
  - Strong and weak chapter sections are displayed when data exists.

### Report Without Assessment Data

- Use a new account with no assessment attempts.
- Open `/report`.
- Expected:
  - Empty state is shown.
  - Page does not crash.
  - User is guided to start an assessment.

### Practice From Report

- On `/report`, click a practice recommendation.
- Expected:
  - A new quiz is generated.
  - User can answer questions.
  - User can view the result.
  - Render logs show a request to `/learning-report/practice`.

## 6. Layout And UI

### Desktop Layout

- Open the dashboard on desktop.
- Create enough chat messages to require scrolling.
- Expected:
  - Only the chat message area scrolls.
  - Header and sidebars stay aligned.
  - Input bar remains usable.

### Mobile Layout

- Open DevTools mobile viewport.
- Open and close the menu.
- Expected:
  - Sidebar opens and closes correctly.
  - Header remains visible.
  - Chat input remains usable.

## 7. Deploy And Environment

### Backend Health

- Open:

```text
https://your-render-backend.onrender.com/health
```

- Expected:

```json
{"status":"ok"}
```

### Frontend Backend URL

- Open DevTools `Network`.
- Trigger login, chat, assessment, and report actions.
- Expected:
  - Requests go to the Render backend URL.
  - Requests do not go to `localhost:8888`.

## Minimum Demo Checklist

- Login works.
- Chat works.
- Quiz from chat works.
- Assessment can be generated and submitted.
- Mastery score is saved and displayed.
- `/report` displays a learning report.
- Practice from report generates a quiz.
- Chat scrolling layout works on desktop.

