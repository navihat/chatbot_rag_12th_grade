import SourceCard from "./SourceCard";
import QuizCard from "./QuizCard";
import type { Message } from "@/lib/api";

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.quiz) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] flex flex-col gap-1 items-start">
          <span className="text-xs text-gray-400 ml-1">📝 Câu hỏi trắc nghiệm</span>
          <QuizCard quiz={message.quiz} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {!isUser && (
          <span className="text-xs text-gray-400 ml-1">⚗️ Trợ lý Hóa học</span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-gray-100 text-gray-800 rounded-bl-sm"
          }`}
        >
          {message.content || (
            <span className="opacity-40 italic">Đang suy nghĩ...</span>
          )}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-1">
            {message.sources.map((src, i) => (
              <SourceCard key={i} source={src} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
