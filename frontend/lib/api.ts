export interface Source {
  source?: string;
  page?: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function sendMessage(
  question: string,
  history: Array<{ role: string; content: string }>,
  onChunk: (delta?: string, sources?: Source[]) => void,
): Promise<void> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
