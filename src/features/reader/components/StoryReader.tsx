"use client";

import { useState } from "react";
import { Copy, Share2, Heart } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { applyGeresh } from "@/lib/hebrewUtils";
import Link from "next/link";

type StoryReaderProps = {
  storyId: string;
  title: string | null;
  rabbi: string | null;
  body: string | null;
  date?: string;
  initialLikes?: number;
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
  storyId,
  title,
  rabbi,
  body,
  date,
  initialLikes = 0,
}: StoryReaderProps) {
  const { isHe, t } = useLanguage();
  const [hasLiked, setHasLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);

  const handleLike = async () => {
    if (hasLiked) return;
    setHasLiked(true);
    setLikesCount((prev) => prev + 1);

    try {
      await fetch("/api/stories/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyId }),
      });
    } catch (err) {
      console.error("Failed to like story", err);
    }
  };

  const paragraphs = splitParagraphs(body);
  const { dayHe, monthHe } = date && isHe ? parseDateHe(date) : { dayHe: "", monthHe: "" };

  const textAlignClass = isHe ? "text-right" : "text-left";
  const directionClass = isHe ? "rtl" : "ltr";
  // Frank Ruhl Libre for Hebrew titles
  const titleFontStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };
  // Assistant for Hebrew body/metadata
  const bodyFontStyle = {
    fontFamily: isHe ? "var(--font-hebrew-body), var(--font-hebrew), sans-serif" : "var(--font-serif-en), serif",
  };

  return (
    <article className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Date Badge (Hebrew only for now, or adapted) */}
      {isHe && date && (
        <div className="mb-6 flex justify-center">
          <div 
            className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-linear-to-br from-(--reader-accent) to-(--reader-accent)/80 text-(--reader-accent-foreground) shadow-lg shadow-(--reader-accent)/20"
            dir="rtl"
          >
            <span className="text-2xl font-bold leading-none tracking-tight">
              {applyGeresh(dayHe, isHe)}
            </span>
            <span className="text-xs font-medium opacity-90">{applyGeresh(monthHe, isHe)}</span>
          </div>
        </div>
      )}
      {!isHe && date && (
        <p className="mb-6 text-center text-sm font-medium text-[var(--reader-text-muted)]">
          {date}
        </p>
      )}

      {/* Title — Frank Ruhl Libre */}
      <h1
        className={`mb-4 text-3xl font-bold leading-tight text-(--reader-text) sm:text-4xl md:text-5xl ${textAlignClass}`}
        style={titleFontStyle}
        dir={directionClass}
      >
        {applyGeresh(title, isHe)}
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
            className="text-lg font-medium text-(--reader-accent)"
            style={bodyFontStyle}
          >
            {applyGeresh(rabbi, isHe)}
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
              className={`mb-6 text-xl leading-relaxed text-(--reader-text) sm:text-lg sm:leading-loose ${finalDropCapClass}`}
              style={bodyFontStyle}
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

      {/* Bottom Actions */}
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        {/* Like Button */}
        <button
          onClick={handleLike}
          disabled={hasLiked}
          className={`group flex items-center justify-center gap-2 rounded-full border px-6 py-3 font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-(--reader-accent) focus:ring-offset-2 hover:scale-105 active:scale-95 ${
            hasLiked 
              ? "border-rose-200 bg-rose-50 text-rose-500" 
              : "border-border bg-(--reader-surface) text-(--reader-text) hover:border-rose-200 hover:text-rose-500"
          }`}
          style={bodyFontStyle}
        >
          <Heart 
            className={`h-5 w-5 transition-transform ${hasLiked ? "fill-rose-500 text-rose-500 scale-110" : "text-current group-hover:scale-110"}`} 
          />
          <span className="font-bold">{likesCount > 0 ? likesCount : ""}</span>
          <span className="sr-only">{isHe ? "אהבתי" : "Like"}</span>
        </button>

        {/* Custom Share Button */}
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: title || "Sipuraya Story",
                text: `${title} - ${isHe ? "מאת " : "By "}${rabbi}`,
                url: window.location.href,
              }).catch(console.error);
            } else {
              // Fallback for browsers that don't support Web Share API
              navigator.clipboard.writeText(window.location.href);
              alert(isHe ? "הקישור הועתק שיתוף ללוח!" : "Link copied to clipboard!");
            }
          }}
          className="rounded-full bg-(--reader-surface) border border-border px-8 py-3 text-sm font-bold text-(--reader-text) shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          {t("common.share")}
        </button>

        {/* More from this Rabbi Link */}
        {rabbi && (
          <Link
            href={`/read/search?q=${encodeURIComponent(rabbi)}`}
            className="rounded-full bg-(--reader-accent) px-8 py-3 text-sm font-bold text-(--reader-accent-foreground) shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            {isHe ? "עוד סיפורים מהרב הזה" : "More from this Rabbi"}
          </Link>
        )}
      </div>

      {/* Story ID / Feedback Loop */}
      <div className="mt-16 text-center">
        <p 
          className="text-xs text-(--reader-text-muted)/50"
          style={{ fontFamily: "var(--font-serif-en)" }}
        >
          Story ID: {storyId}
        </p>
        <a 
          href={`mailto:info@sipuraya.com?subject=Error Report for Story ${storyId}&body=Hello Sipuraya Team,%0D%0A%0D%0AI found an error in story ${storyId}.%0D%0A%0D%0ADetails: `}
          className="mt-2 inline-block text-xs font-medium text-(--reader-text-muted)/70 transition hover:text-(--reader-text)"
          style={bodyFontStyle}
        >
          {isHe ? "דווח על טעות בסיפור" : "Report an error in this story"}
        </a>
      </div>
    </article>
  );
}
