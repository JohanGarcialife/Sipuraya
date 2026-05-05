"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/features/reader/context/LanguageContext";

type Story = {
  story_id: string;
  rabbi_he: string | null;
  rabbi_en: string | null;
  date_he: string;
  date_en: string;
  title_he: string | null;
  title_en: string | null;
  body_he: string | null;
  body_en: string | null;
  tags: string[];
  image_url?: string | null;
};

type FeaturedResponse = {
  story: Story | null;
  hebrewDate: {
    displayEn: string;
    displayHe: string;
    fullHe: string;
  };
  source: "scheduled" | "date-match" | "random";
};

export default function FeaturedStoryCard() {
  const { isHe } = useLanguage();
  const [data, setData] = useState<FeaturedResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/featured-story")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hebrewFont = { fontFamily: "var(--font-hebrew), serif" };
  const englishFont = { fontFamily: "var(--font-serif-en), serif" };
  const font = isHe ? hebrewFont : englishFont;

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="mb-8 h-[280px] animate-pulse rounded-3xl bg-(--reader-surface) sm:h-[220px]" />
    );
  }

  if (!data?.story) return null;

  const { story, hebrewDate, source } = data;
  const title = isHe ? story.title_he : story.title_en;
  const rabbi = isHe ? story.rabbi_he : story.rabbi_en;
  const excerpt = (isHe ? story.body_he : story.body_en)?.slice(0, 180);
  const dateLabel = isHe ? hebrewDate.displayHe : hebrewDate.displayEn;

  return (
    <section className="mb-8 px-6 md:px-4 sm:px-3" aria-label="Story of the Day">
      <Link href={`/read/${story.story_id}`} className="group block focus:outline-none">
        <div
          className={`
            relative overflow-hidden rounded-3xl shadow-lg transition-all duration-300
            hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.99]
            bg-(--reader-surface)
          `}
          style={{ minHeight: "260px" }}
        >
          {/* ── Background image or gradient ── */}
          <div className="absolute inset-0">
            {story.image_url ? (
              <>
                <Image
                  src={story.image_url}
                  alt={title ?? "Featured Story"}
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 800px) 100vw, 800px"
                  priority
                />
                {/* Heavy gradient so text always pops */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10" />
              </>
            ) : (
              /* No image — render a rich gradient card */
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/80 via-amber-800/60 to-stone-900" />
            )}
          </div>

          {/* ── Content overlay ── */}
          <div
            className="relative z-10 flex flex-col justify-end gap-3 p-8 sm:p-5"
            style={{ minHeight: "260px" }}
            dir={isHe ? "rtl" : "ltr"}
          >
            {/* Label row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* "Story of the Day" badge */}
              <span
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm shadow"
                style={font}
              >
                ✦ {isHe ? "סיפור היום" : "Story of the Day"}
              </span>

              {/* Date badge */}
              {source === "scheduled" && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {dateLabel}
                </span>
              )}
            </div>

            {/* Title */}
            {title && (
              <h2
                className="text-2xl font-bold leading-tight text-white drop-shadow-lg sm:text-xl line-clamp-2"
                style={font}
              >
                {title}
              </h2>
            )}

            {/* Excerpt */}
            {excerpt && (
              <p
                className="text-sm text-white/75 leading-relaxed line-clamp-2 drop-shadow sm:hidden"
                style={font}
              >
                {excerpt}…
              </p>
            )}

            {/* Rabbi & CTA row */}
            <div className="flex items-center justify-between gap-3 flex-wrap mt-1">
              {rabbi && (
                <span className="text-sm font-semibold text-amber-300/90 drop-shadow" style={font}>
                  {rabbi}
                </span>
              )}
              <span
                className={`
                  inline-flex items-center gap-1.5 rounded-xl border border-white/30
                  bg-white/10 px-4 py-2 text-xs font-semibold text-white
                  backdrop-blur-md transition group-hover:bg-white/20
                `}
                style={font}
              >
                {isHe ? "קרא את הסיפור" : "Read story"} →
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}
