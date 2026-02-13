"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border text-[1.1rem] leading-none text-[var(--reader-text)] transition-colors duration-200 hover:bg-[var(--reader-surface)]"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
