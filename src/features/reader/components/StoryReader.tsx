"use client";

import { useLanguage } from "../context/LanguageContext";

type StoryReaderProps = {
  title: string | null;
  rabbi: string | null;
  body: string | null;
  date?: string;
};

function parseDateHe(dateHe: string): { dayHe: string; monthHe: string } {
  const parts = dateHe.split(" ");
  if (parts.length >= 2) {
    return { dayHe: parts[0], monthHe: parts.slice(1).join(" ") };
  }
  return { dayHe: dateHe, monthHe: "" };
}

/**
 * Split body text into paragraphs for rendering.
 */
function splitParagraphs(body: string | null): string[] {
  if (!body) return [];
  return body
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export default function StoryReader({
  title,
  rabbi,
  body,
  date,
}: StoryReaderProps) {
  const { isHe, t } = useLanguage();

  const paragraphs = splitParagraphs(body);
  const { dayHe, monthHe } = date && isHe ? parseDateHe(date) : { dayHe: "", monthHe: "" };

  const textAlignClass = isHe ? "text-right" : "text-left";
  const directionClass = isHe ? "rtl" : "ltr";
  const fontFamilyStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };

  return (
    <article className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Date Badge (Hebrew only for now, or adapted) */}
      {isHe && date && (
        <div className="mb-6 flex justify-center">
          <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-linear-to-br from-[var(--reader-accent)] to-[var(--reader-accent)]/80 text-[var(--reader-accent-foreground)] shadow-lg shadow-[var(--reader-accent)]/20">
            <span className="text-2xl font-bold leading-none tracking-tight">
              {dayHe}
            </span>
            <span className="text-xs font-medium opacity-90">{monthHe}</span>
          </div>
        </div>
      )}
      {!isHe && date && (
        <p className="mb-6 text-center text-sm font-medium text-[var(--reader-text-muted)]">
          {date}
        </p>
      )}

      {/* Title */}
      <h1
        className={`mb-4 text-3xl font-bold leading-tight text-[var(--reader-text)] sm:text-4xl md:text-5xl ${textAlignClass}`}
        style={fontFamilyStyle}
        dir={directionClass}
      >
        {title}
      </h1>

      {/* Rabbi / Author */}
      {rabbi && (
        <div
          className={`mb-10 flex items-center gap-3 ${
            isHe ? "flex-row" : "flex-row-reverse justify-end"
          }`}
          dir={directionClass}
        >
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-[var(--reader-border)] to-transparent opacity-50" />
          <p
            className="text-lg font-medium text-[var(--reader-accent)]"
            style={fontFamilyStyle}
          >
            {isHe ? "מאת" : "By"} {rabbi}
          </p>
          <div className="h-px flex-1 bg-linear-to-r from-transparent via-[var(--reader-border)] to-transparent opacity-50" />
        </div>
      )}

      {/* Body Text */}
      <div
        className={`prose prose-lg max-w-none ${textAlignClass}`}
        dir={directionClass}
      >
        {paragraphs.map((paragraph, index) => {
          // Drop cap for first paragraph
          const isFirst = index === 0;
          const dropCapClass = isFirst
            ? "first-letter:float-right first-letter:ml-3 first-letter:text-7xl first-letter:font-bold first-letter:line-through first-letter:text-[var(--reader-accent)]"
            : "";
          // Note for English drop cap: float-left, mr-3.
          // Adjusting logic:
          const finalDropCapClass = isFirst
            ? isHe
              ? "first-letter:float-right first-letter:ml-3 first-letter:text-5xl first-letter:font-bold first-letter:text-[var(--reader-accent)]"
              : "first-letter:float-left first-letter:mr-3 first-letter:text-5xl first-letter:font-bold first-letter:text-[var(--reader-accent)]"
            : "";

          return (
            <p
              key={index}
              className={`mb-6 text-xl leading-relaxed text-[var(--reader-text)] sm:text-lg sm:leading-loose ${finalDropCapClass}`}
              style={fontFamilyStyle}
            >
              {paragraph}
            </p>
          );
        })}
      </div>

      {/* Divider */}
      <div className="my-12 flex items-center justify-center gap-4 opacity-30">
        <div className="h-1 w-1 rounded-full bg-[var(--reader-text-muted)]" />
        <div className="h-1 w-1 rounded-full bg-[var(--reader-text-muted)]" />
        <div className="h-1 w-1 rounded-full bg-[var(--reader-text-muted)]" />
      </div>

      {/* Share Button (Mock) */}
      <div className="mt-12 flex justify-center">
        <button className="rounded-full bg-[var(--reader-surface)] px-8 py-3 text-sm font-medium text-[var(--reader-text)] shadow-sm transition-transform hover:scale-105 active:scale-95">
          {t("common.share")}
        </button>
      </div>
    </article>
  );
}
