"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { sendMessage, generateQuiz, type Message } from "@/lib/api";

const WELCOME: Message = {
  role: "assistant",
  content: "Xin chào! Tôi là trợ lý học tập môn Hóa học lớp 12 (SGK Kết nối tri thức).\n\nHãy đặt câu hỏi về lý thuyết Hóa học — hoặc yêu cầu \"tạo câu hỏi trắc nghiệm về [chủ đề]\" để luyện tập.",
  sources: [],
};

const QUIZ_KEYWORDS = ["trắc nghiệm", "trac nghiem", "quiz", "tạo câu hỏi", "tao cau hoi", "đề thi", "de thi", "bài kiểm tra", "bai kiem tra"];

function isQuizRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return QUIZ_KEYWORDS.some((kw) => lower.includes(kw));
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(question: string) {
    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    if (isQuizRequest(question)) {
      await handleQuizRequest(question);
    } else {
      await handleChatRequest(question);
    }

    setLoading(false);
  }

  async function handleQuizRequest(question: string) {
    const placeholderMsg: Message = {
      role: "assistant",
      content: "Đang tạo câu hỏi trắc nghiệm...",
    };
    setMessages((prev) => [...prev, placeholderMsg]);

    try {
      const quiz = await generateQuiz(question);
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "", quiz };
        return updated;
      });
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Có lỗi xảy ra khi tạo câu hỏi.";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: errorText };
        return updated;
      });
    }
  }

  async function handleChatRequest(question: string) {
    const assistantMsg: Message = { role: "assistant", content: "", sources: [] };
    setMessages((prev) => [...prev, assistantMsg]);

    const history = messages
      .filter((m) => m.content !== "")
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));

    try {
      await sendMessage(question, history, (delta, sources) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          if (delta !== undefined) last.content += delta;
          if (sources !== undefined) last.sources = sources;
          updated[updated.length - 1] = last;
          return updated;
        });
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Xin lỗi, có lỗi kết nối. Vui lòng kiểm tra backend và thử lại.",
        };
        return updated;
      });
    }
  }

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden flex-1">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-1 px-2 py-1">
            <span className="text-xs text-gray-400 mr-1">⚗️</span>
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                style={{ animationDelay: `${delay}ms` }}
                className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce"
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <InputBar onSend={handleSend} disabled={loading} />
    </div>
  );
}
