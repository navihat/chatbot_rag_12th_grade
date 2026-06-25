"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getEmail, isAuthenticated } from "@/lib/auth";
import {
  generateReportPractice,
  getLearningReport,
  type LearningReport,
  type PracticeRecommendation,
  type Quiz,
} from "@/lib/api";
import AppHeader from "@/components/AppHeader";
import QuizCard from "@/components/QuizCard";

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function statusLabel(status: string): string {
  if (status === "Expert") return "Thành thạo";
  if (status === "Proficient") return "Cần củng cố";
  return "Cần đào tạo lại";
}

function statusClass(status: string): string {
  if (status === "Expert") return "text-emerald-300 bg-emerald-500/10 border-emerald-500/20";
  if (status === "Proficient") return "text-amber-300 bg-amber-500/10 border-amber-500/20";
  return "text-rose-300 bg-rose-500/10 border-rose-500/20";
}

export default function LearningReportPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [report, setReport] = useState<LearningReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [practiceLoadingId, setPracticeLoadingId] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState("");
  const [practiceQuiz, setPracticeQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    setReady(true);
    setEmail(getEmail() ?? "Học sinh lớp 12");
  }, [router]);

  useEffect(() => {
    if (!ready) return;

    async function loadReport() {
      setLoading(true);
      setError("");
      try {
        setReport(await getLearningReport());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thể tải báo cáo học tập.");
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [ready]);

  const hasData = (report?.summary.total_attempts ?? 0) > 0;
  const weakestLevel = report?.summary.weakest_level;
  const levelBreakdown = useMemo(() => report?.level_breakdown ?? [], [report]);

  async function handlePractice(recommendation: PracticeRecommendation) {
    setPracticeLoadingId(recommendation.id);
    setPracticeError("");
    setPracticeQuiz(null);
    try {
      setPracticeQuiz(await generateReportPractice(recommendation));
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : "Không thể tạo bài luyện tập.");
    } finally {
      setPracticeLoadingId(null);
    }
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#090a0f] text-gray-200 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[460px] h-[460px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/5 w-[460px] h-[460px] rounded-full bg-pink-500/5 blur-[150px] pointer-events-none" />

      <AppHeader title="Báo cáo học tập" subtitle="Hóa học 12" email={email} active="report" />

      <section className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {loading ? (
          <div className="h-[70vh] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500 font-semibold">Đang tổng hợp báo cáo học tập...</span>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center space-y-3">
            <h2 className="text-base font-bold text-red-300">Không thể tải báo cáo</h2>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : report && !hasData ? (
          <div className="rounded-3xl glass-card border-white/10 p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-extrabold">
              0%
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white">Chưa có dữ liệu đánh giá</h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Hoàn thành ít nhất một bài đánh giá năng lực để hệ thống tạo báo cáo học tập và gợi ý luyện tập cá nhân hóa.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex text-xs font-bold px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Bắt đầu đánh giá
            </Link>
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
              <section className="rounded-3xl glass-card border-white/10 p-5 md:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-white/5 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Tổng quan từ dữ liệu đánh giá</span>
                    <h2 className="text-2xl font-extrabold text-white mt-1">Báo cáo kết quả học tập</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-extrabold text-gradient">{report.summary.average_mastery}%</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mastery trung bình</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Lượt trả lời</span>
                    <p className="text-2xl font-extrabold text-white mt-1">{report.summary.total_attempts}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cấp độ yếu nhất</span>
                    <p className="text-lg font-extrabold text-rose-300 mt-1">{weakestLevel?.label ?? "Chưa đủ dữ liệu"}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-4">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Độ chính xác</span>
                    <p className="text-lg font-extrabold text-indigo-300 mt-1">{weakestLevel ? percent(weakestLevel.accuracy) : "N/A"}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/10 p-4 space-y-2">
                  <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Nhận xét của LLM</h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                    {report.llm_report || "Chưa có nhận xét tự động."}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChapterList title="Chương cần ưu tiên" chapters={report.summary.weakest_chapters} />
                  <ChapterList title="Chương mạnh nhất" chapters={report.summary.strongest_chapters} />
                </div>
              </section>

              <aside className="rounded-3xl glass-card border-white/10 p-5 md:p-6 space-y-5">
                <div>
                  <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider">Phân tích cấp độ</span>
                  <h2 className="text-lg font-extrabold text-white mt-1">Nhận biết - Thông hiểu - Vận dụng</h2>
                </div>
                <div className="space-y-3">
                  {levelBreakdown.map((level) => (
                    <div key={level.level} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{level.label}</span>
                        <span className="text-gray-400">{level.correct}/{level.total} đúng</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all"
                          style={{ width: percent(level.accuracy) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-5">
              <div className="rounded-3xl glass-card border-white/10 p-5 md:p-6 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Luyện tập cá nhân hóa</span>
                  <h2 className="text-lg font-extrabold text-white mt-1">Gợi ý từ báo cáo</h2>
                </div>

                {report.practice_recommendations.length === 0 ? (
                  <p className="text-sm text-gray-400">Chưa có gợi ý luyện tập. Hãy làm thêm bài đánh giá để tạo dữ liệu.</p>
                ) : (
                  <div className="space-y-3">
                    {report.practice_recommendations.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handlePractice(item)}
                        disabled={practiceLoadingId !== null}
                        className="w-full text-left rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 p-4 transition-all active:scale-[0.99] disabled:opacity-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <h3 className="text-sm font-bold text-white">{item.title}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">{item.prompt}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-2 py-1">
                            Cấp {item.level}
                          </span>
                        </div>
                        <span className="block text-[10px] font-bold text-emerald-300 mt-3">
                          {practiceLoadingId === item.id ? "Đang tạo bài luyện..." : "Tạo bài luyện tập"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {practiceError && (
                  <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-3 text-xs text-red-300">
                    {practiceError}
                  </div>
                )}
              </div>

              <div className="rounded-3xl glass-card border-white/10 p-5 md:p-6 min-h-[420px] flex items-center justify-center">
                {practiceQuiz ? (
                  <QuizCard quiz={practiceQuiz} />
                ) : (
                  <div className="text-center space-y-2 max-w-sm">
                    <div className="mx-auto w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-indigo-300 font-bold">
                      AI
                    </div>
                    <h3 className="text-sm font-bold text-white">Chọn một gợi ý để luyện tập</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Hệ thống sẽ dùng báo cáo học tập và nội dung SGK để tạo bài luyện tập phù hợp với điểm yếu hiện tại.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function ChapterList({
  title,
  chapters,
}: {
  title: string;
  chapters: LearningReport["summary"]["weakest_chapters"];
}) {
  return (
    <div className="rounded-2xl bg-white/[0.01] border border-white/5 p-4 space-y-3">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h3>
      {chapters.length === 0 ? (
        <p className="text-xs text-gray-500">Chưa đủ dữ liệu.</p>
      ) : (
        <div className="space-y-2">
          {chapters.map((chapter) => (
            <div key={chapter.chapter} className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-300 truncate">{chapter.chapter}</span>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border shrink-0 ${statusClass(chapter.highest_status)}`}>
                {chapter.highest_mastery_score}% · {statusLabel(chapter.highest_status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
