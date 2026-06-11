"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

const EXAMPLES = [
  "Axit HCl có tính chất hóa học gì?",
  "Chất béo là gì? Viết p/ứ thủy phân",
  "Tạo 4 câu trắc nghiệm về Este",
  "Tạo câu hỏi trắc nghiệm Amin - Protein",
];

export default function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
    
    // Reset height of textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }

  return (
    <div className="border-t border-white/5 bg-[#0e0f15]/80 p-4 space-y-3 shrink-0 backdrop-blur-md">
      {/* Suggestion tags */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setValue(ex);
              if (textareaRef.current) {
                textareaRef.current.focus();
                // Minimal delay to let value bind
                setTimeout(() => {
                  if (textareaRef.current) {
                    textareaRef.current.style.height = "auto";
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
                  }
                }, 50);
              }
            }}
            disabled={disabled}
            className="text-[11px] font-semibold tracking-wide px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.05] hover:border-white/10 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed select-none"
          >
            💡 {ex}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="flex gap-2.5 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKey}
            disabled={disabled}
            placeholder="Hỏi lý thuyết SGK Hóa 12... (Enter để gửi)"
            rows={1}
            style={{ height: "auto" }}
            className="w-full resize-none rounded-2xl glass-input px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-40 text-white placeholder-gray-600 font-medium leading-relaxed"
          />
        </div>
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg hover:shadow-indigo-500/10 active:scale-95 transition-all disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed group"
          title="Gửi tin nhắn"
        >
          <svg
            className="w-4.5 h-4.5 text-white transform -rotate-45 -translate-x-0.5 translate-y-0.5 group-hover:translate-x-0 group-hover:-translate-y-0 transition-transform"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
