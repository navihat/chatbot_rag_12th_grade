"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setToken, setEmail } from "@/lib/auth";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setFormEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isRegister) {
        const token = await register(email, password);
        setToken(token);
        setEmail(email);
        setSuccess("Đăng ký thành công! Đang chuyển hướng...");
        setTimeout(() => {
          router.replace("/");
        }, 1000);
      } else {
        const token = await login(email, password);
        setToken(token);
        setEmail(email);
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#090a0f] relative overflow-hidden flex items-center justify-center p-4">
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Main glass card */}
      <div className="w-full max-w-sm glass-panel rounded-3xl p-8 relative z-10 glow-accent border-white/10 transition-all duration-300">
        <div className="text-center mb-6 relative">
          {/* Animated beaker container */}
          <div className="inline-flex items-center justify-center relative mb-4">
            <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full scale-75 animate-pulse-glow" />
            <svg
              className="w-16 h-16 text-indigo-400 relative z-10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3h12" />
              <path d="M9 3v4.5L4.5 19A2 2 0 0 0 6.4 21h11.2a2 2 0 0 0 1.9-2.5L15 7.5V3" />
              <path
                d="M5.5 16.5c1 0 1.5-.5 2.5-.5s1.5.5 2.5.5 1.5-.5 2.5-.5 1.5.5 2.5.5 1.5-.5 2.5-.5"
                stroke="url(#liquidGradient)"
                strokeWidth="1"
                fill="none"
              />
              <path
                d="M5.5 16.5c1 0 1.5-.5 2.5-.5s1.5.5 2.5.5 1.5-.5 2.5-.5 1.5.5 2.5.5 1.5-.5 2.5-.5L18 20.5a.5.5 0 0 1-.5.5H6.5a.5.5 0 0 1-.5-.5L5.5 16.5z"
                fill="url(#liquidGradient)"
                opacity="0.3"
              />
              <defs>
                <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#f472b6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Bubble particles */}
            <div className="absolute top-1 left-7 w-1 h-1 bg-pink-400 rounded-full bubble-particle" style={{ animationDelay: "0s" }} />
            <div className="absolute top-2 left-9 w-1.5 h-1.5 bg-indigo-400 rounded-full bubble-particle" style={{ animationDelay: "0.6s" }} />
            <div className="absolute top-0 left-5 w-1 h-1 bg-cyan-400 rounded-full bubble-particle" style={{ animationDelay: "1.2s" }} />
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Hóa Học <span className="text-gradient">12</span>
          </h1>
          <p className="text-xs text-gray-400 mt-2 font-medium uppercase tracking-wider">
            {isRegister ? "Đăng ký tài khoản mới" : "Trợ lý lý thuyết thông minh"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">
              Email đăng nhập
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="ten@viethoc.edu.vn"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-2xl glass-input focus:outline-none text-sm placeholder-gray-700 text-white font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider pl-1">
              Mật khẩu (tối thiểu 6 ký tự)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 rounded-2xl glass-input focus:outline-none text-sm placeholder-gray-700 text-white font-medium"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs text-center font-medium animate-pulse">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs text-center font-medium">
              ✓ {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-sm tracking-wide shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </span>
            ) : isRegister ? (
              "Đăng ký"
            ) : (
              "Bắt đầu học tập"
            )}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-all focus:outline-none"
          >
            {isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký ngay"}
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Chương trình Hóa Học 12 — Kết nối tri thức. Nhập email và mật khẩu của bạn để đồng bộ lịch sử học tập.
          </p>
        </div>
      </div>
    </main>
  );
}
