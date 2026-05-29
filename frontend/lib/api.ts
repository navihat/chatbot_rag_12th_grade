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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("hoa12_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function handleUnauthorized(status: number): void {
  if (status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("hoa12_token");
    window.location.href = "/login";
  }
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
