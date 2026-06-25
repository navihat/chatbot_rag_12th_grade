"use client";

import { useState, useEffect } from "react";
import { getMasteryStatus, getChapterQuestions, submitChapterAssessment } from "@/lib/api";

interface ChapterMastery {
  chapter: string;
  mastery_score: number;
  status: "Novice" | "Proficient" | "Expert";
  highest_mastery_score: number;
  highest_status: "Novice" | "Proficient" | "Expert";
  updated_at?: string;
}

const CHAPTERS_LIST = [
  "Chương 1: Este - Lipit",
  "Chương 2: Cacbohidrat",
  "Chương 3: Amin - Peptit - Protein",
  "Chương 4: Vật liệu Polime",
  "Chương 5: Pin điện & Điện phân",
  "Chương 6: Đại cương kim loại",
  "Chương 7: Nhóm IA, IIA & Nhôm",
  "Chương 8: Sắt & Phức chất",
];

interface Question {
  id: number;
  chapter: string;
  level: number;
  level_name?: string;
  question: string;
  options: Record<string, string>;
}

interface AssessmentResult {
  score: number;
  status: "Novice" | "Proficient" | "Expert";
  correctness: number[];
  correct_answers: Record<string, string>;
  explanations: Record<string, string>;
}

interface Props {
  onTriggerPractice: (chapterQuery: string) => void;
}

export default function DiagnosticView({ onTriggerPractice }: Props) {
  const [masteries, setMasteries] = useState<Record<string, ChapterMastery>>({});
  const [loading, setLoading] = useState(true);

  // Test states
  const [activeTestChapter, setActiveTestChapter] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Timers for response time
  const [qStartTime, setQStartTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<Record<string, number>>({});

  // Results states
  const [testResult, setTestResult] = useState<AssessmentResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all mastery statuses on mount
  useEffect(() => {
    loadMasteryStatus();
  }, []);

  async function loadMasteryStatus() {
    setLoading(true);
    try {
      const data = await getMasteryStatus();
      const mapped: Record<string, ChapterMastery> = {};

      // Seed default 0% values
      CHAPTERS_LIST.forEach((ch) => {
        mapped[ch] = {
          chapter: ch,
          mastery_score: 0.0,
          status: "Novice",
          highest_mastery_score: 0.0,
          highest_status: "Novice"
        };
      });

      // Override with actual database values
      data.forEach((item: any) => {
        mapped[item.chapter] = {
          chapter: item.chapter,
          mastery_score: item.mastery_score,
          status: item.status,
          highest_mastery_score: item.highest_mastery_score || 0.0,
          highest_status: item.highest_status || "Novice",
          updated_at: item.updated_at,
        };
      });

      setMasteries(mapped);
    } catch (err) {
      console.error("Failed to load mastery data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Start test for a chapter
  async function startChapterTest(chapter: string) {
    setActiveTestChapter(chapter);
    setQuizLoading(true);
    setTestResult(null);
    setAnswers({});
    setResponseTimes({});
    setCurrentQIdx(0);

    try {
      const data = await getChapterQuestions(chapter);
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setQStartTime(Date.now());
      } else {
        alert("Không thể sinh câu hỏi vào lúc này. Vui lòng thử lại.");
        setActiveTestChapter(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi kết nối hoặc gọi API. Hãy kiểm tra backend.");
      setActiveTestChapter(null);
    } finally {
      setQuizLoading(false);
    }
  }

  // Handle option select
  function handleSelectOption(opt: string) {
    const q = questions[currentQIdx];
    const qIdStr = q.id.toString();

    // Calculate elapsed time for this question
    const elapsed = (Date.now() - qStartTime) / 1000;

    setAnswers((prev) => ({ ...prev, [qIdStr]: opt }));
    setResponseTimes((prev) => ({ ...prev, [qIdStr]: elapsed }));
  }

  // Move to next question or submit
  async function handleNext() {
    if (currentQIdx < questions.length - 1) {
      setCurrentQIdx((prev) => prev + 1);
      setQStartTime(Date.now()); // reset timer for next question
    } else {
      // Submit assessment
      if (!activeTestChapter) return;
      setSubmitting(true);
      try {
        const result = await submitChapterAssessment(activeTestChapter, answers, responseTimes);
        setTestResult(result);
        loadMasteryStatus(); // Reload updated stats
      } catch (err) {
        alert(err instanceof Error ? err.message : "Lỗi khi nộp bài. Vui lòng thử lại.");
      } finally {
        setSubmitting(false);
      }
    }
  }

  function getStatusLabel(status: "Novice" | "Proficient" | "Expert") {
    if (status === "Expert") return "Thành thạo";
    if (status === "Proficient") return "Cần củng cố";
    return "Cần đào tạo lại";
  }

  function getStatusBadgeClass(status: "Novice" | "Proficient" | "Expert") {
    if (status === "Expert") return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (status === "Proficient") return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    return "bg-rose-500/10 text-rose-300 border-rose-500/20";
  }

  // Render Dashboard
  if (!activeTestChapter) {
    return (
      <div className="flex flex-col bg-[#12131a]/70 border border-white/5 rounded-3xl overflow-hidden flex-1 h-full min-h-0 shadow-2xl relative backdrop-blur-xl p-6 space-y-6">
        <div className="border-b border-white/5 pb-4 select-none">
          <h2 className="text-xl font-extrabold text-white font-outfit tracking-tight">
            📊 Bản Đồ Năng Lực & Độ Thông Thạo
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Độ thông thạo (Mastery Score) bắt đầu từ 0% và được cập nhật dựa trên chuỗi câu trả lời đúng, trọng số độ khó và tốc độ làm bài của bạn.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500 font-medium">Đang đồng bộ chỉ số thông thạo từ Supabase...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CHAPTERS_LIST.map((chapterName) => {
                const item = masteries[chapterName] || {
                  chapter: chapterName,
                  mastery_score: 0.0,
                  status: "Novice",
                  highest_mastery_score: 0.0,
                  highest_status: "Novice",
                };
                const highestScore = item.highest_mastery_score;
                const highestStatus = item.highest_status;
                const latestScore = item.mastery_score;

                const scoreColor = highestStatus === "Expert" ? "text-emerald-400" : highestStatus === "Proficient" ? "text-amber-400" : "text-rose-400";
                const barColor = highestStatus === "Expert" ? "bg-emerald-500" : highestStatus === "Proficient" ? "bg-amber-500" : "bg-rose-500";

                return (
                  <div key={chapterName} className="p-4 rounded-2xl glass-card border-white/5 hover:border-white/10 transition-all duration-200 flex flex-col justify-between space-y-3 relative group">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold text-white leading-tight font-outfit max-w-[70%]">{chapterName}</h3>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadgeClass(highestStatus as any)}`}>
                          {getStatusLabel(highestStatus as any)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between select-none">
                        <div className="flex items-baseline gap-1">
                          <span className={`text-xl font-extrabold ${scoreColor}`}>{highestScore}%</span>
                          <span className="text-[10px] text-gray-500">cao nhất</span>
                        </div>
                        {latestScore > 0 && (
                          <span className="text-[10px] text-gray-400 font-medium bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-lg">
                            Gần nhất: {latestScore}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${highestScore}%` }} />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => startChapterTest(chapterName)}
                        className="flex-1 text-[10px] font-bold py-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 text-white transition-all active:scale-[0.98]"
                      >
                        ⚡ Đánh giá
                      </button>
                      <button
                        onClick={() => onTriggerPractice(`Tạo 5 câu hỏi trắc nghiệm kiểm tra lý thuyết về: ${chapterName}`)}
                        className="flex-1 text-[10px] font-bold py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/15 transition-all active:scale-[0.98]"
                      >
                        💬 Luyện tập với Chatbot
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Quiz Loading State
  if (quizLoading) {
    return (
      <div className="flex flex-col bg-[#12131a]/70 border border-white/5 rounded-3xl items-center justify-center p-8 flex-1 h-full min-h-0 text-center space-y-6 backdrop-blur-xl relative">
        <div className="absolute inset-0 bg-indigo-500/5 blur-2xl pointer-events-none" />
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-75 animate-pulse" />
          <svg
            className="w-16 h-16 text-indigo-400 relative z-10 animate-pulse"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12M9 3v4.5L4.5 19A2 2 0 0 0 6.4 21h11.2a2 2 0 0 0 1.9-2.5L15 7.5V3" />
          </svg>
          <div className="absolute top-1 left-7 w-1 h-1 bg-pink-400 rounded-full bubble-particle" />
          <div className="absolute top-2 left-9 w-1.5 h-1.5 bg-indigo-400 rounded-full bubble-particle" style={{ animationDelay: "0.5s" }} />
        </div>
        <div className="space-y-2 max-w-sm">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI đang biên soạn đề thi</h3>
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Mô hình đang truy xuất dữ liệu từ SGK Hóa 12 và tự động tạo 10 câu hỏi trắc nghiệm (Nhận biết - Thông hiểu - Vận dụng) cho **{activeTestChapter}**...
          </p>
        </div>
      </div>
    );
  }

  // Render Quiz Results View
  if (testResult) {
    const isExpert = testResult.status === "Expert";
    const isProficient = testResult.status === "Proficient";
    const statusColor = isExpert ? "text-emerald-400" : isProficient ? "text-amber-400" : "text-rose-400";
    const statusBadge = isExpert
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
      : isProficient
        ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
        : "bg-rose-500/10 text-rose-300 border-rose-500/20";

    const recommendation = isExpert
      ? "Xuất sắc! Bạn đã thông thạo chương này. Hệ thống khuyên dùng bỏ qua lý thuyết cơ bản để làm các bài tập nâng cao."
      : isProficient
        ? "Khá tốt! Bạn có nền tảng. Hệ thống khuyến nghị ôn tập lại các câu hỏi sai và luyện tập thêm với chatbot."
        : "Bạn cần cải thiện nhiều. Hệ thống đã cập nhật gợi ý đào tạo lại từ đầu. Hãy bấm nút 'Luyện tập với Chatbot' để chatbot hỗ trợ giảng giải.";

    return (
      <div className="flex flex-col bg-[#12131a]/70 border border-white/5 rounded-3xl overflow-hidden flex-1 h-full min-h-0 shadow-2xl relative backdrop-blur-xl p-6 space-y-5">
        <div className="text-center space-y-1 pb-3 border-b border-white/5 relative z-10">
          <div className="text-4xl">📊</div>
          <h2 className="text-lg font-bold text-white font-outfit">Kết Quả Đánh Giá Năng Lực</h2>
          <p className="text-xs text-indigo-300 font-semibold">{activeTestChapter}</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-5 relative z-10">
          {/* Main Stats Card */}
          <div className="p-5 rounded-2xl glass-card border-white/10 text-center space-y-3 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/5 blur-2xl rounded-full" />
            <div className="relative z-10 space-y-1.5">
              <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Chỉ số thông thạo đạt được</span>
              <p className="text-4xl font-extrabold text-gradient">{testResult.score}%</p>
              <div className={`inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${statusBadge}`}>
                {getStatusLabel(testResult.status)}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed max-w-sm mx-auto font-medium pt-1">
                {recommendation}
              </p>
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider pl-1">Nhật ký chi tiết các câu trả lời</h3>
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const isCorrect = testResult.correctness[idx] === 1;
                const correctOption = testResult.correct_answers[q.id.toString()];
                const explanation = testResult.explanations[q.id.toString()];

                return (
                  <div key={q.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Câu {idx + 1} · Cấp độ {q.level} ({q.level_name || (q.level === 1 ? "Nhận biết" : q.level === 2 ? "Thông hiểu" : "Vận dụng")})</span>
                        <p className="text-xs font-bold text-white leading-relaxed">{q.question}</p>
                      </div>
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold shrink-0 border ${isCorrect
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}>
                        {isCorrect ? "✓" : "✗"}
                      </span>
                    </div>

                    {!isCorrect && (
                      <div className="text-[11px] p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                        <p className="text-gray-400">
                          Đáp án đúng: <span className="text-emerald-400 font-bold">{correctOption}</span>
                        </p>
                        <p className="text-gray-500 leading-relaxed">
                          <span className="font-bold text-gray-400">Giải thích:</span> {explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 border-t border-white/5 flex gap-3">
          <button
            onClick={() => startChapterTest(activeTestChapter)}
            className="flex-1 text-xs font-bold py-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-white transition-all active:scale-[0.98]"
          >
            🔄 Kiểm tra lại
          </button>
          <button
            onClick={() => setActiveTestChapter(null)}
            className="flex-1 text-xs font-bold py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white hover:from-indigo-600 hover:to-pink-600 active:scale-[0.98] transition-all"
          >
            Quay lại Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render Quiz Wizard View
  const currentQuestion = questions[currentQIdx];
  const answered = currentQuestion ? currentQuestion.id.toString() in answers : false;
  const selectedOption = currentQuestion ? answers[currentQuestion.id.toString()] : "";

  return (
    <div className="flex flex-col bg-[#12131a]/70 border border-white/5 rounded-3xl overflow-hidden flex-1 h-full min-h-0 shadow-2xl relative backdrop-blur-xl p-5 md:p-6 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div>
          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            📝 {activeTestChapter}
          </span>
        </div>
        <span className="text-xs font-extrabold text-gray-400">
          Câu {currentQIdx + 1} / {questions.length}
        </span>
      </div>

      {/* Progress line */}
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentQIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Details */}
      {currentQuestion && (
        <div className="flex-1 flex flex-col justify-center space-y-5 max-w-lg mx-auto w-full">
          <div>
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
              CẤP ĐỘ {currentQuestion.level} · {currentQuestion.level_name || (currentQuestion.level === 1 ? "Nhận biết" : currentQuestion.level === 2 ? "Thông hiểu" : "Vận dụng")}
            </span>
            <h3 className="text-sm md:text-base font-extrabold text-white leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedOption === key;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectOption(key)}
                  className={`w-full text-left text-xs md:text-sm px-4 py-3.5 rounded-2xl border transition-all duration-150 flex items-center group active:scale-[0.99] ${isSelected
                    ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-300 font-semibold"
                    : "bg-white/[0.01] border-white/5 hover:bg-white/[0.04] hover:border-white/10 text-gray-300"
                    }`}
                >
                  <span className={`w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-bold shrink-0 mr-3 transition-colors ${isSelected
                    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
                    : "bg-white/5 border-white/10 text-gray-400 group-hover:text-white"
                    }`}>
                    {key}
                  </span>
                  <span>{value}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-2 border-t border-white/5 flex justify-end">
        <button
          onClick={handleNext}
          disabled={!answered || submitting}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed transition-all"
        >
          {submitting ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang tính điểm...
            </span>
          ) : currentQIdx < questions.length - 1 ? (
            "Câu tiếp theo →"
          ) : (
            "Nộp bài kiểm tra"
          )}
        </button>
      </div>
    </div>
  );
}
