"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearToken, getEmail } from "@/lib/auth";
import AppHeader from "@/components/AppHeader";
import ChatWindow from "@/components/ChatWindow";
import DiagnosticView from "@/components/DiagnosticView";
import Logo from "@/components/Logo";

interface Chapter {
  id: number;
  title: string;
  query: string;
}

const CHAPTERS: Chapter[] = [
  { id: 1, title: "Chương 1: Este - Lipit", query: "Tóm tắt lý thuyết Chương 1: Este và Lipit" },
  { id: 2, title: "Chương 2: Cacbohidrat", query: "Cacbohidrat gồm những chất nào và tính chất lý thuyết gì?" },
  { id: 3, title: "Chương 3: Amin - Peptit - Protein", query: "Phân biệt tính bazơ của các amin và cấu trúc peptit" },
  { id: 4, title: "Chương 4: Vật liệu Polime", query: "Các phương pháp trùng hợp và trùng ngưng polime" },
  { id: 5, title: "Chương 5: Pin điện & Điện phân", query: "Nguyên tắc hoạt động của pin điện hóa và điện phân" },
  { id: 6, title: "Chương 6: Đại cương kim loại", query: "Tính chất hóa học chung của kim loại và dãy điện hóa" },
  { id: 7, title: "Chương 7: Nhóm IA, IIA & Nhôm", query: "Tính chất đặc trưng của Nhôm và hợp chất lưỡng tính" },
  { id: 8, title: "Chương 8: Sắt & Phức chất", query: "Lý thuyết về Sắt và khái niệm về phức chất hóa học lớp 12" },
];

const QUICK_STATS = [
  { label: "Môn học", value: "Hóa học 12" },
  { label: "Bộ sách", value: "Kết nối tri thức" },
  { label: "Chế độ RAG", value: "SGK Lý thuyết" },
];

const MEMORY_TIPS = [
  { title: "Este hóa", content: "Phản ứng este hóa giữa axit và ancol là thuận nghịch, cần xúc tác H2SO4 đặc nóng." },
  { title: "Tráng bạc", content: "Glucozơ, Fructozơ và Mantozơ đều có phản ứng tráng bạc với AgNO3/NH3." },
  { title: "Tính bazơ Amin", content: "Amin thơm (Anilin) < NH3 < Amin béo bậc 1 < Amin béo bậc 2." },
  { title: "Dãy điện hóa", content: "Khi nào cần may áo giáp sắt nên sang phố hỏi cửa hàng á phi âu." },
];

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "mastery">("chat");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [email, setUserEmail] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
      setUserEmail(getEmail() ?? "Học sinh lớp 12");
    }
  }, [router]);

  if (!ready) return null;

  return (
    <main className="h-screen bg-[#090a0f] text-gray-200 flex flex-col overflow-hidden font-sans relative">
      {/* Background decoration glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/5 blur-[150px] pointer-events-none" />

      <AppHeader
        title="Dashboard học tập"
        subtitle="Hóa học 12"
        email={email}
        active="dashboard"
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">

      {/* LEFT SIDEBAR - LEARNING DASHBOARD */}
      <aside className={`
        fixed top-16 bottom-0 left-0 w-72 glass-panel border-r border-white/5 flex flex-col z-50 transform transition-transform duration-300 lg:relative lg:top-auto lg:bottom-auto lg:translate-x-0
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Logo size="md" className="glow-accent" />
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight leading-none">
                Hóa Học <span className="text-gradient">12</span>
              </h1>
              <span className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">Kết nối tri thức</span>
            </div>
          </div>
          <button
            className="lg:hidden text-gray-500 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-3.5 border-b border-white/5 space-y-1.5 shrink-0 select-none">
          <button
            onClick={() => {
              setActiveTab("chat");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-500/5"
                : "text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <span className="text-base">💬</span> Phòng Hỏi Đáp (RAG)
          </button>
          <button
            onClick={() => {
              setActiveTab("mastery");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 ${
              activeTab === "mastery"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-md shadow-indigo-500/5"
                : "text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <span className="text-base">📊</span> Đánh Giá Năng Lực
          </button>
          <button
            onClick={() => {
              setSidebarOpen(false);
              router.push("/report");
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
          >
            <span className="text-base">AI</span> Báo cáo học tập
          </button>
        </div>

        {/* Scrollable Chapters List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Quick stats box */}
          <div className="p-4 rounded-2xl glass-card border-white/5 space-y-2.5">
            <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500">Thông tin học tập</span>
            <div className="grid grid-cols-1 gap-1.5">
              {QUICK_STATS.map((stat, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-500">{stat.label}</span>
                  <span className="text-gray-300 font-medium">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chapters */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-gray-500 px-2">Hỏi nhanh theo chương</span>
            <nav className="space-y-1">
              {CHAPTERS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActivePrompt(ch.query);
                    setActiveTab("chat");
                    setSidebarOpen(false);
                  }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] active:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all duration-200 flex items-center justify-between group"
                >
                  <span className="truncate group-hover:translate-x-0.5 transition-transform">{ch.title}</span>
                  <span className="text-[10px] opacity-0 group-hover:opacity-100 text-indigo-400 transition-opacity">⚡</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-black/10 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-[70%]">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              HS
            </div>
            <span className="text-xs font-semibold text-gray-300 truncate" title={email}>
              {email}
            </span>
          </div>
          <button
            onClick={() => { clearToken(); router.replace("/login"); }}
            className="text-[11px] font-bold text-red-400/80 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* CENTER AREA */}
      <section className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 p-4 md:p-6 flex flex-col max-w-4xl w-full mx-auto">
          {activeTab === "chat" ? (
            <ChatWindow
              externalPrompt={activePrompt}
              onClearExternalPrompt={() => setActivePrompt(null)}
            />
          ) : (
            <DiagnosticView
              onTriggerPractice={(chapterQuery) => {
                setActivePrompt(chapterQuery);
                setActiveTab("chat");
              }}
            />
          )}
        </div>
      </section>

      {/* RIGHT SIDEBAR - STUDY HELPER */}
      <aside className="hidden xl:flex w-80 glass-panel border-l border-white/5 flex-col p-6 space-y-6 overflow-y-auto">
        <h2 className="text-sm font-bold text-white tracking-wide border-b border-white/5 pb-3 flex items-center gap-2">
          💡 Mẹo ghi nhớ nhanh
        </h2>
        <div className="space-y-4">
          {MEMORY_TIPS.map((tip, i) => (
            <div key={i} className="p-4 rounded-2xl glass-card border-white/5 space-y-2 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-pink-500 opacity-70" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{tip.title}</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                {tip.content}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-auto p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-center space-y-2">
          <span className="text-xs font-bold text-indigo-300 block">🤖 Trợ lý AI Hóa Học</span>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Học tập hiệu quả bằng cách đặt câu hỏi lý thuyết hoặc ôn tập với bộ câu hỏi trắc nghiệm tự động tạo theo yêu cầu.
          </p>
        </div>
      </aside>
      </div>
    </main>
  );
}
