"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { sendMessage, generateQuiz, getChatHistory, clearChatHistory, type Message } from "@/lib/api";

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

interface Props {
  externalPrompt?: string | null;
  onClearExternalPrompt?: () => void;
}

export default function ChatWindow({ externalPrompt, onClearExternalPrompt }: Props) {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await getChatHistory();
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([WELCOME]);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setInitLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle prompts sent from the sidebar
  useEffect(() => {
    if (externalPrompt) {
      handleSend(externalPrompt);
      onClearExternalPrompt?.();
    }
  }, [externalPrompt]);

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

  async function handleClearHistory() {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện này?")) {
      try {
        setLoading(true);
        await clearChatHistory();
        setMessages([WELCOME]);
      } catch (err) {
        console.error("Failed to clear history:", err);
        window.alert("Không thể xóa lịch sử cuộc trò chuyện. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }
  }

  const isInitialState = messages.length === 1 && messages[0].content === WELCOME.content;

  return (
    <div className="flex flex-col bg-[#12131a]/70 border border-white/5 rounded-3xl overflow-hidden flex-1 h-[88vh] shadow-2xl relative backdrop-blur-xl">
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Chat header panel */}
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between bg-black/10 shrink-0 relative z-10 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
          <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Phòng học lý thuyết</span>
        </div>
        {messages.length > 1 && !initLoading && (
          <button
            onClick={handleClearHistory}
            disabled={loading}
            className="text-[10px] font-bold text-gray-400 hover:text-red-400 bg-white/[0.02] hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 px-2.5 py-1 rounded-xl transition-all active:scale-95 disabled:opacity-40 flex items-center gap-1"
          >
            🗑️ Xóa lịch sử
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 relative z-10">
        {initLoading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3">
            <svg
              className="w-8 h-8 text-indigo-400 animate-spin"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
            <span className="text-xs text-gray-500 font-medium animate-pulse">Đang khôi phục hội thoại...</span>
          </div>
        ) : isInitialState ? (
          // Welcome Dashboard
          <div className="h-full flex flex-col items-center justify-center text-center p-4 max-w-md mx-auto space-y-6">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-90 animate-pulse-glow" />
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg relative z-10 select-none">
                ⚗️
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white font-outfit">
                Trợ lý Hóa Học <span className="text-gradient">Lớp 12</span>
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed font-medium">
                Chào mừng bạn đến với công cụ hỗ trợ học tập môn Hóa học 12 theo chương trình SGK Kết nối tri thức. 
                Hãy đặt câu hỏi lý thuyết hoặc ôn tập nhanh với các đề trắc nghiệm ngẫu nhiên.
              </p>
            </div>
            
            {/* Quick Starter actions */}
            <div className="grid grid-cols-1 gap-2.5 w-full pt-2">
              <button 
                onClick={() => handleSend("Tạo 4 câu trắc nghiệm ngẫu nhiên")}
                className="w-full text-left p-3.5 rounded-2xl glass-card border-white/5 hover:border-indigo-500/20 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-3 group"
              >
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-300 flex items-center justify-center text-[10px] shrink-0 font-bold">📝</span>
                <div className="truncate">
                  <span className="font-bold block text-white text-[11px] mb-0.5">Tạo đề tự luyện trắc nghiệm</span>
                  Luyện tập 4 câu hỏi trắc nghiệm lý thuyết ngẫu nhiên.
                </div>
              </button>
              <button 
                onClick={() => handleSend("Tóm tắt tính chất hóa học của Este")}
                className="w-full text-left p-3.5 rounded-2xl glass-card border-white/5 hover:border-pink-500/20 text-xs text-gray-400 hover:text-white transition-all flex items-center gap-3 group"
              >
                <span className="w-6 h-6 rounded-lg bg-pink-500/10 text-pink-300 flex items-center justify-center text-[10px] shrink-0 font-bold">📖</span>
                <div className="truncate">
                  <span className="font-bold block text-white text-[11px] mb-0.5">Hỏi lý thuyết hóa học</span>
                  Tóm tắt tính chất hóa học đặc trưng của Este.
                </div>
              </button>
            </div>
          </div>
        ) : (
          // Standard Message List
          messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))
        )}

        {/* Loading Indicator */}
        {loading && !initLoading && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 text-[11px] font-bold text-indigo-300 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl w-fit animate-pulse select-none">
            <svg
              className="w-3.5 h-3.5 text-indigo-400 animate-spin"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
            </svg>
            <span>Đang tra cứu dữ liệu SGK Hóa Học 12...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <InputBar onSend={handleSend} disabled={loading || initLoading} />
    </div>
  );
}
