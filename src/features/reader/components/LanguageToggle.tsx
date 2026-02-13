"use client";

type LanguageToggleProps = {
  language: "he" | "en";
  onToggle: (lang: "he" | "en") => void;
};

export default function LanguageToggle({
  language,
  onToggle,
}: LanguageToggleProps) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border">
      <button
        className={`cursor-pointer px-3 py-1.5 text-xs font-semibold transition-colors duration-200 sm:px-2 sm:py-1 ${
          language === "en"
            ? "bg-[var(--reader-accent)] text-[var(--reader-accent-foreground)]"
            : "text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface)]"
        }`}
        onClick={() => onToggle("en")}
        aria-label="English"
      >
        EN
      </button>
      <button
        className={`cursor-pointer px-3 py-1.5 text-xs font-semibold transition-colors duration-200 sm:px-2 sm:py-1 ${
          language === "he"
            ? "bg-[var(--reader-accent)] text-[var(--reader-accent-foreground)]"
            : "text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface)]"
        }`}
        onClick={() => onToggle("he")}
        aria-label="עברית"
      >
        עב
      </button>
    </div>
  );
}
