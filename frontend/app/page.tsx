"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/auth";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl flex flex-col h-[92vh]">
        <header className="text-center mb-3 shrink-0 flex items-center justify-between">
          <div className="flex-1" />
          <div>
            <h1 className="text-2xl font-bold text-indigo-700 tracking-tight">
              ⚗️ Chatbot Hóa Học 12
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Trả lời dựa trên SGK Hóa học 12 – Kết nối tri thức · Chỉ lý thuyết, không tính toán nâng cao
            </p>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => { clearToken(); router.replace("/login"); }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <ChatWindow />
      </div>
    </main>
  );
}
