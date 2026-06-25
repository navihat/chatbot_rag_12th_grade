"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";
import Logo from "@/components/Logo";

interface Props {
  title: string;
  subtitle?: string;
  email?: string;
  active?: "dashboard" | "report";
  onMenuClick?: () => void;
}

export default function AppHeader({
  title,
  subtitle = "Hóa học 12",
  email,
  active,
  onMenuClick,
}: Props) {
  const router = useRouter();

  return (
    <header className="h-16 border-b border-white/5 glass-panel flex items-center justify-between px-4 md:px-8 relative z-40 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-400 hover:text-white focus:outline-none rounded-xl p-1.5 hover:bg-white/[0.04] transition-colors"
            aria-label="Mở menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" />
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold text-white leading-none truncate">{title}</h1>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider truncate block">
              {subtitle}
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {email && (
          <span className="hidden md:block text-xs text-gray-400 max-w-[220px] truncate" title={email}>
            {email}
          </span>
        )}
        <Link
          href="/"
          className={`text-xs font-bold rounded-xl px-3 py-2 transition-colors border ${
            active === "dashboard"
              ? "text-indigo-200 bg-indigo-500/15 border-indigo-500/25"
              : "text-indigo-300 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/report"
          className={`text-xs font-bold rounded-xl px-3 py-2 transition-colors border ${
            active === "report"
              ? "text-emerald-200 bg-emerald-500/15 border-emerald-500/25"
              : "text-emerald-300 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
          }`}
        >
          Báo cáo
        </Link>
        <button
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
          className="text-xs font-bold text-red-400/80 hover:text-red-300 px-3 py-2 rounded-xl hover:bg-red-500/10 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
