"use client";

import { useState, type KeyboardEvent } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

const EXAMPLES = [
  "Axit HCl có tính chất hóa học gì?",
  "Phản ứng oxi hóa khử là gì?",
  "Este là gì? Cho ví dụ.",
  "Liên kết ion là gì?",
];

export default function InputBar({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  function submit() {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white p-3 space-y-2 shrink-0">
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => { setValue(ex); }}
            disabled={disabled}
            className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {ex}
          </button>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder="Hỏi về nội dung SGK Hóa học 12… (Enter để gửi, Shift+Enter xuống dòng)"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:opacity-50 disabled:bg-gray-50"
        />
        <button
          onClick={submit}
          disabled={disabled || !value.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
