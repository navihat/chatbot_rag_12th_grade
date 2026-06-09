import SourceCard from "./SourceCard";
import QuizCard from "./QuizCard";
import type { Message } from "@/lib/api";

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (message.quiz) {
    return (
      <div className="flex justify-start w-full animate-fade-in-up">
        <div className="max-w-[95%] sm:max-w-[85%] flex flex-col gap-2 items-start w-full">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider pl-1 select-none">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            📝 Bài tập tự luyện trắc nghiệm
          </div>
          <QuizCard quiz={message.quiz} />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
      <div className={`max-w-[85%] flex gap-3 ${isUser ? "flex-row-reverse items-end" : "flex-row items-start"}`}>
        {/* Avatar/Icon for Assistant */}
        {!isUser && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-sm shrink-0 glow-accent select-none mt-1">
            🧪
          </div>
        )}

        <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
          {/* Sender label */}
          {!isUser && (
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 select-none">
              Trợ lý lý thuyết Hóa học
            </span>
          )}

          {/* Bubble content */}
          <div
            className={`px-4.5 py-3 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm font-medium transition-all ${
              isUser
                ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-br-none border border-indigo-400/20 hover:shadow-indigo-500/10"
                : "glass-card text-gray-200 rounded-bl-none border-white/5 hover:border-white/10"
            }`}
          >
            {message.content ? (
              // Simple text rendering, replace double asterisks with styled bold text for basic markdown styling
              message.content.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                  return (
                    <strong key={index} className="text-white font-extrabold bg-white/[0.05] px-1 py-0.5 rounded">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })
            ) : (
              <span className="opacity-40 italic flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-ping" />
                Đang biên soạn câu trả lời...
              </span>
            )}
          </div>

          {/* Sources under Assistant Message */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-1 mt-1">
              {message.sources.map((src, i) => (
                <SourceCard key={i} source={src} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
