export interface Source {
  source?: string;
  page?: number;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
}

export interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  quiz?: Quiz;
}

export interface MasteryChapterSummary {
  chapter: string;
  mastery_score: number;
  status: "Novice" | "Proficient" | "Expert";
  highest_mastery_score: number;
  highest_status: "Novice" | "Proficient" | "Expert";
  updated_at?: string;
}

export interface LevelBreakdown {
  level: number;
  label: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface PracticeRecommendation {
  id: string;
  chapter: string;
  level: number;
  title: string;
  prompt: string;
}

export interface LearningReport {
  summary: {
    average_mastery: number;
    total_attempts: number;
    strongest_chapters: MasteryChapterSummary[];
    weakest_chapters: MasteryChapterSummary[];
    weakest_level: LevelBreakdown | null;
  };
  level_breakdown: LevelBreakdown[];
  llm_report: string;
  practice_recommendations: PracticeRecommendation[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8888";

async function getErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json() as { detail?: string; error?: string };
    return data.detail ?? data.error ?? `${fallback} (HTTP ${res.status})`;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("hoa12_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(status: number): void {
  if (status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("hoa12_token");
    localStorage.removeItem("hoa12_email");
    window.location.href = "/login";
  }
}

export async function register(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json() as { token?: string; error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Đăng ký không thành công.");
  }
  return data.token!;
}

export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await res.json() as { token?: string; error?: string };
  if (!res.ok || data.error) {
    throw new Error(data.error ?? "Đăng nhập không thành công.");
  }
  return data.token!;
}

export async function getChatHistory(): Promise<Message[]> {
  const res = await fetch(`${API_URL}/chat/history`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.json() as Message[];
}

export async function clearChatHistory(): Promise<void> {
  const res = await fetch(`${API_URL}/chat/history/clear`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function getChapterQuestions(chapter: string): Promise<any> {
  const encoded = encodeURIComponent(chapter);
  const res = await fetch(`${API_URL}/assessment/chapter/questions?chapter=${encoded}`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(await getErrorMessage(res, "Cannot load chapter questions."));
  }
  return await res.json();
}

export async function submitChapterAssessment(
  chapter: string,
  answers: Record<string, string>,
  responseTimes: Record<string, number>
): Promise<any> {
  const res = await fetch(`${API_URL}/assessment/chapter/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ chapter, answers, response_times: responseTimes }),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(await getErrorMessage(res, "Cannot submit chapter assessment."));
  }
  return await res.json();
}

export async function getMasteryStatus(): Promise<any[]> {
  const res = await fetch(`${API_URL}/assessment/mastery`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(await getErrorMessage(res, "Cannot load mastery status."));
  }
  return await res.json();
}

export async function getLearningReport(): Promise<LearningReport> {
  const res = await fetch(`${API_URL}/learning-report`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(await getErrorMessage(res, "Cannot load learning report."));
  }
  return await res.json() as LearningReport;
}

export async function generateReportPractice(recommendation: PracticeRecommendation): Promise<Quiz> {
  const res = await fetch(`${API_URL}/learning-report/practice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(recommendation),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(await getErrorMessage(res, "Cannot generate report practice."));
  }
  return await res.json() as Quiz;
}

export async function sendMessage(
  question: string,
  history: Array<{ role: string; content: string }>,
  onChunk: (delta?: string, sources?: Source[]) => void,
): Promise<void> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question, history }),
  });

  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(`HTTP ${res.status}`);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") return;
      try {
        const json = JSON.parse(raw) as { delta?: string; sources?: Source[] };
        if (json.delta !== undefined) onChunk(json.delta, undefined);
        if (json.sources !== undefined) onChunk(undefined, json.sources);
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

export async function generateQuiz(question: string): Promise<Quiz> {
  const res = await fetch(`${API_URL}/quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json() as { error?: string; topic?: string; questions?: QuizQuestion[] };
  if (data.error) throw new Error(data.error);
  return data as Quiz;
}
