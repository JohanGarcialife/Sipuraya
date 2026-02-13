"use client";

import LanguageToggle from "./LanguageToggle";
import HebrewDateBadge from "./HebrewDateBadge";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../context/LanguageContext";

type ReaderNavProps = {
  dayHe?: string;
  monthHe?: string;
  fullHe?: string;
};

export default function ReaderNav({
  dayHe,
  monthHe,
  fullHe,
}: ReaderNavProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-[color-mix(in_oklch,var(--reader-bg)_85%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[900px] items-center justify-between px-6 py-3 md:px-4 md:py-2.5 sm:px-3 sm:py-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-bold tracking-wide text-[var(--reader-accent)] md:text-xl sm:text-lg"
            style={{ fontFamily: "var(--font-hebrew), serif" }}
          >
            סיפוריא
          </span>
          <span
            className="text-sm italic text-[var(--reader-text-muted)] md:hidden"
            style={{ fontFamily: "var(--font-serif-en), serif" }}
          >
            Sipuraya
          </span>
        </div>

        {/* Hebrew date */}
        <div className="flex items-center gap-3">
          {dayHe && monthHe && (
            <HebrewDateBadge dayHe={dayHe} monthHe={monthHe} />
          )}
        </div>

        {/* Language toggle + Theme toggle */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageToggle language={language} onToggle={setLanguage} />
        </div>
      </div>
    </nav>
  );
}
