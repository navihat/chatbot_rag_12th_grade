"use client";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Logo({ className = "", size }: LogoProps) {
  let sizeClass = className;
  if (size === "sm") sizeClass = "w-5 h-5";
  else if (size === "md") sizeClass = "w-8 h-8";
  else if (size === "lg") sizeClass = "w-14 h-14";
  else if (size === "xl") sizeClass = "w-16 h-16";

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClass}`}>
      <svg
        className="w-full h-full text-indigo-400 relative z-10"
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
      <div
        className="absolute top-[6%] left-[43%] w-[6%] h-[6%] bg-pink-400 rounded-full bubble-particle"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute top-[12%] left-[56%] w-[9%] h-[9%] bg-indigo-400 rounded-full bubble-particle"
        style={{ animationDelay: "0.6s" }}
      />
      <div
        className="absolute top-[0%] left-[31%] w-[6%] h-[6%] bg-cyan-400 rounded-full bubble-particle"
        style={{ animationDelay: "1.2s" }}
      />
    </div>
  );
}
