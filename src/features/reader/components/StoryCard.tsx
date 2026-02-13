"use client";

import Link from "next/link";
import HebrewDateBadge from "./HebrewDateBadge";
import { useLanguage } from "../context/LanguageContext";

type StoryCardProps = {
  storyId: string;
  titleHe: string | null;
  titleEn: string | null;
  rabbiHe: string | null;
  rabbiEn: string | null;
  bodyHe: string | null;
  bodyEn: string | null;
  dateHe: string;
  dateEn: string;
};

/**
 * Extract day (gematria) and month from a Hebrew date like "י״ז אדר"
 */
function parseDateHe(dateHe: string): { dayHe: string; monthHe: string } {
  const parts = dateHe.split(" ");
  if (parts.length >= 2) {
    return { dayHe: parts[0], monthHe: parts.slice(1).join(" ") };
  }
  return { dayHe: dateHe, monthHe: "" };
}

/**
 * Get a text preview (first ~150 chars) from the story body
 */
function getPreview(body: string | null, maxLength: number = 150): string {
  if (!body) return "";
  const clean = body.replace(/\n+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).replace(/\s+\S*$/, "") + "…";
}

export default function StoryCard({
  storyId,
  titleHe,
  titleEn,
  rabbiHe,
  rabbiEn,
  bodyHe,
  bodyEn,
  dateHe,
  dateEn,
}: StoryCardProps) {
  const { isHe, t } = useLanguage();
  const title = isHe ? titleHe : titleEn;
  const rabbi = isHe ? rabbiHe : rabbiEn;
  const body = isHe ? bodyHe : bodyEn;
  const { dayHe, monthHe } = parseDateHe(dateHe);

  // Dynamic classes based on language
  const directionClass = isHe ? "flex-row-reverse text-right" : "flex-row text-left";
  const fontFamilyStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };

  return (
    <Link href={`/read/${storyId}`} className="block no-underline">
      <article className="group cursor-pointer rounded-2xl border border-border bg-[var(--reader-surface)] p-8 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg md:p-5 sm:p-4 sm:rounded-xl">
        <div className={`flex gap-5 items-start ${directionClass} sm:gap-3`}>
          {/* Date Badge */}
          <div className="shrink-0">
            <HebrewDateBadge dayHe={dayHe} monthHe={monthHe} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3
              className="mb-2 text-2xl font-bold leading-tight text-[var(--reader-text)] transition-colors md:text-[1.35rem] sm:text-[1.25rem] sm:leading-snug"
              style={fontFamilyStyle}
            >
              {title || (isHe ? "(ללא כותרת)" : "(Untitled)")}
            </h3>

            {/* Rabbi */}
            {rabbi && (
              <p
                className="mb-3 text-[0.9rem] font-medium text-[var(--reader-accent)]"
                style={fontFamilyStyle}
              >
                {isHe ? `מאת ${rabbi}` : `By ${rabbi}`}
              </p>
            )}

            {/* Preview */}
            <p
              className="text-[0.95rem] leading-relaxed text-[var(--reader-text-muted)]"
              style={fontFamilyStyle}
            >
              {getPreview(body)}
            </p>
          </div>
        </div>
        {/* Read More Link */}
        <div
          className="mt-4 flex items-center gap-1 text-sm font-bold text-[var(--reader-accent)] transition-opacity hover:opacity-80"
          style={{ fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif" }}
        >
          {t("common.readMore")}
          <span className="text-lg leading-none" style={{ transform: isHe ? "rotate(180deg)" : "none" }}>→</span>
        </div>
      </article>
    </Link>
  );
}
