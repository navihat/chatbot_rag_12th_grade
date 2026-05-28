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
    const base = "w-full text-left text-sm px-3 py-2 rounded-lg border transition disabled:cursor-default";
    if (!answered) return `${base} bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 text-gray-700`;
    if (opt === q.correct) return `${base} bg-green-50 border-green-500 text-green-800`;
    if (opt === userAnswer) return `${base} bg-red-50 border-red-400 text-red-700`;
    return `${base} bg-gray-50 border-gray-200 text-gray-400`;
  }

  if (showScore) {
    const emoji = score === total ? "🎉" : score >= total / 2 ? "👍" : "📚";
    return (
      <div className="bg-white border border-indigo-200 rounded-2xl p-4 max-w-lg space-y-3">
        <div className="text-center space-y-1">
          <div className="text-3xl">{emoji}</div>
          <p className="font-semibold text-gray-800">
            Kết quả: {score}/{total} câu đúng
          </p>
          <p className="text-xs text-gray-500">Chủ đề: {quiz.topic}</p>
        </div>

        <div className="space-y-1.5">
          {quiz.questions.map((item, i) => {
            const correct = answers[item.id] === item.correct;
            return (
              <div key={item.id} className="flex items-start gap-2 text-xs">
                <span className={correct ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                  {correct ? "✓" : "✗"}
                </span>
                <div className="text-gray-600">
                  <span className="font-medium">Câu {i + 1}:</span>{" "}
                  {correct
                    ? "Đúng"
                    : `Sai — Đáp án đúng: ${item.correct}. ${item.explanation}`}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { setAnswers({}); setCurrentIdx(0); setShowScore(false); }}
          className="w-full text-sm py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition font-medium"
        >
          Làm lại
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl p-4 max-w-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
          📝 {quiz.topic}
        </span>
        <span className="text-xs text-gray-400">
          {currentIdx + 1} / {total}
        </span>
      </div>

      {/* Progress */}
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-400 rounded-full transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-gray-800 leading-relaxed">
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
            <span className="font-semibold mr-2">{key}.</span>
            {val}
          </button>
        ))}
      </div>

      {/* Explanation */}
      {answered && (
        <div
          className={`text-xs p-2.5 rounded-lg leading-relaxed ${
            userAnswer === q.correct
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {userAnswer === q.correct ? (
            <span className="font-medium">✓ Chính xác! </span>
          ) : (
            <span className="font-medium">✗ Chưa đúng. Đáp án đúng: {q.correct}. </span>
          )}
          {q.explanation}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2">
        {currentIdx > 0 && (
          <button
            onClick={() => setCurrentIdx((i) => i - 1)}
            className="flex-1 text-sm py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            ← Câu trước
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setCurrentIdx((i) => i + 1)}
            disabled={!answered}
            className="flex-1 text-sm py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Câu tiếp →
          </button>
        ) : (
          <button
            onClick={() => setShowScore(true)}
            disabled={!allAnswered}
            className="flex-1 text-sm py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Xem kết quả
          </button>
        )}
      </div>
    </div>
  );
}
