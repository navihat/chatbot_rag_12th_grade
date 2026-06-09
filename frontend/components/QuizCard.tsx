"use client";

import { useState } from "react";
import type { Quiz } from "@/lib/api";

interface Props {
  quiz: Quiz;
}

export default function QuizCard({ quiz }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showScore, setShowScore] = useState(false);

  const total = quiz.questions.length;
  const q = quiz.questions[currentIdx];
  const answered = q.id in answers;
  const userAnswer = answers[q.id];
  const isLast = currentIdx === total - 1;
  const score = quiz.questions.filter((item) => answers[item.id] === item.correct).length;
  const allAnswered = Object.keys(answers).length === total;

  function selectOption(opt: string) {
    if (answered) return;
    setAnswers((prev) => ({ ...prev, [q.id]: opt }));
  }

  function optionClass(opt: string): string {
    const base = "w-full text-left text-xs md:text-sm px-4 py-3.5 rounded-2xl border transition-all duration-200 disabled:cursor-default flex items-center justify-between group";
    
    if (!answered) {
      return `${base} bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10 hover:text-white text-gray-300 active:scale-[0.99]`;
    }
    
    if (opt === q.correct) {
      return `${base} bg-emerald-500/10 border-emerald-500/20 text-emerald-300 font-semibold shadow-[0_0_15px_rgba(16,185,129,0.08)]`;
    }
    
    if (opt === userAnswer) {
      return `${base} bg-red-500/10 border-red-500/20 text-red-300 font-semibold`;
    }
    
    return `${base} bg-transparent border-white/[0.02] text-gray-600 opacity-40`;
  }

  function getOptionLabelClass(opt: string): string {
    const base = "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mr-3 transition-colors border";
    if (!answered) {
      return `${base} bg-white/5 border-white/10 text-gray-400 group-hover:bg-white/10 group-hover:text-white group-hover:border-white/20`;
    }
    if (opt === q.correct) {
      return `${base} bg-emerald-500/20 border-emerald-500/30 text-emerald-300`;
    }
    if (opt === userAnswer) {
      return `${base} bg-red-500/20 border-red-500/30 text-red-300`;
    }
    return `${base} bg-transparent border-transparent text-gray-600`;
  }

  if (showScore) {
    const ratio = score / total;
    const emoji = ratio === 1 ? "🏆" : ratio >= 0.8 ? "🎉" : ratio >= 0.5 ? "👍" : "📚";
    const feedback = ratio === 1 
      ? "Xuất sắc! Bạn đã nắm vững lý thuyết phần này." 
      : ratio >= 0.8 
        ? "Rất tốt! Cố gắng luyện tập thêm chút nữa." 
        : ratio >= 0.5 
          ? "Đạt yêu cầu. Hãy đọc thêm kỹ SGK Hóa 12." 
          : "Cần cải thiện. Ôn tập kỹ lý thuyết và thử lại nhé.";

    return (
      <div className="glass-card border-white/10 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative overflow-hidden animate-fade-in-up">
        {/* Background glow behind icon */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />

        <div className="text-center space-y-2 relative z-10">
          <div className="text-5xl animate-bounce">{emoji}</div>
          <h3 className="text-lg font-bold text-white font-outfit">Kết quả trắc nghiệm</h3>
          <p className="text-3xl font-extrabold text-gradient">{score} / {total} câu đúng</p>
          <p className="text-xs text-gray-400 font-medium">Chủ đề: {quiz.topic}</p>
          <p className="text-xs text-indigo-300 font-semibold px-4 py-1.5 rounded-xl bg-indigo-500/5 inline-block mt-1">{feedback}</p>
        </div>

        <div className="space-y-2 border-t border-white/5 pt-4 max-h-[220px] overflow-y-auto pr-1">
          {quiz.questions.map((item, i) => {
            const isCorrect = answers[item.id] === item.correct;
            return (
              <div key={item.id} className="flex items-start gap-2.5 text-xs p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                <span className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-extrabold ${
                  isCorrect 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {isCorrect ? "✓" : "✗"}
                </span>
                <div className="text-gray-400 leading-relaxed">
                  <span className="font-bold text-white block mb-0.5">Câu {i + 1} {isCorrect ? "(Đúng)" : "(Sai)"}</span>
                  {!isCorrect && (
                    <p className="text-gray-500">
                      Đáp án đúng: <span className="text-emerald-400 font-semibold">{item.correct}</span>. {item.explanation}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { setAnswers({}); setCurrentIdx(0); setShowScore(false); }}
          className="w-full text-xs font-bold py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white transition-all active:scale-[0.98]"
        >
          Làm lại bài thi
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card border-white/10 rounded-3xl p-5 md:p-6 w-full max-w-lg space-y-4 shadow-xl select-none animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-pink-300 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-full select-none uppercase tracking-wider">
          🧪 {quiz.topic}
        </span>
        <span className="text-xs text-gray-500 font-bold select-none">
          {currentIdx + 1} / {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(129,140,248,0.5)]"
          style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-[14px] md:text-[15px] font-extrabold text-white leading-relaxed font-sans pt-1">
        Câu {currentIdx + 1}: {q.question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {Object.entries(q.options).map(([key, val]) => (
          <button
            key={key}
            onClick={() => selectOption(key)}
            disabled={answered}
            className={optionClass(key)}
          >
            <span className="flex items-center">
              <span className={getOptionLabelClass(key)}>{key}</span>
              <span className="font-medium text-left">{val}</span>
            </span>

            {/* Answer Icons */}
            {answered && key === q.correct && (
              <span className="text-emerald-400 shrink-0 select-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            )}
            {answered && key === userAnswer && key !== q.correct && (
              <span className="text-red-400 shrink-0 select-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Explanation */}
      {answered && (
        <div
          className={`text-xs p-3.5 rounded-2xl leading-relaxed border transition-all duration-300 font-medium ${
            userAnswer === q.correct
              ? "bg-emerald-500/5 text-emerald-300 border-emerald-500/10"
              : "bg-red-500/5 text-red-300 border-red-500/10"
          }`}
        >
          {userAnswer === q.correct ? (
            <span className="font-extrabold text-emerald-400 block mb-0.5">✓ TRẢ LỜI CHÍNH XÁC!</span>
          ) : (
            <span className="font-extrabold text-red-400 block mb-0.5">✗ CHƯA CHÍNH XÁC (Đáp án: {q.correct})</span>
          )}
          <p className="text-gray-400 font-medium">{q.explanation}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {currentIdx > 0 && (
          <button
            onClick={() => setCurrentIdx((i) => i - 1)}
            className="flex-1 text-xs font-bold py-3 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.05] hover:border-white/10 transition-all"
          >
            ← Câu trước
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setCurrentIdx((i) => i + 1)}
            disabled={!answered}
            className="flex-1 text-xs font-bold py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
          >
            Câu tiếp →
          </button>
        ) : (
          <button
            onClick={() => setShowScore(true)}
            disabled={!allAnswered}
            className="flex-1 text-xs font-bold py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:from-indigo-600 hover:to-pink-600 active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
          >
            Xem kết quả bài tập
          </button>
        )}
      </div>
    </div>
  );
}
