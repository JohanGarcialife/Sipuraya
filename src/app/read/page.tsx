"use client";

import { useState, useEffect, useCallback } from "react";
import ReaderNav from "@/features/reader/components/ReaderNav";
import StoryRibbon from "@/features/reader/components/StoryRibbon";
import PosterCard from "@/features/reader/components/PosterCard";
import HeroSection from "@/features/reader/components/HeroSection";
import { useLanguage } from "@/features/reader/context/LanguageContext";

type HebrewDate = {
  day: number;
  month: string;
  monthHe: string;
  dayHe: string;
  year: number;
  displayEn: string;
  displayHe: string;
  fullHe: string;
};

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
};

type DailyStoriesResponse = {
  stories: Story[];
  hebrewDate: HebrewDate;
  totalForToday: number;
  afterSunset: boolean;
};

// Cache to avoid re-fetching the same offset twice per session
const dateCache = new Map<number, DailyStoriesResponse>();

export default function ReadPage() {
  const { language, isHe, t } = useLanguage();

  // dateOffset: 0 = today, -1 = yesterday, +1 = tomorrow, etc. Clamped to [-2, +2]
  const [dateOffset, setDateOffset] = useState(0);
  const [data, setData] = useState<DailyStoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stories for the given offset, using session cache to avoid redundant calls
  const fetchStories = useCallback(async (offset: number) => {
    if (dateCache.has(offset)) {
      setData(dateCache.get(offset)!);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/daily-stories?count=5&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to fetch stories");
      const json: DailyStoriesResponse = await res.json();
      dateCache.set(offset, json);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories(dateOffset);
  }, [dateOffset, fetchStories]);

  const fontFamilyStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };
  const directionClass = isHe ? "rtl" : "ltr";

  // --- Date Navigation Bar ---
  // Renders 5 tabs: -2, -1, 0 (Today), +1, +2
  // The label for each tab comes from the current data's hebrewDate (for the active offset)
  // and a pre-labelled set for the others. Since we don't know the Hebrew date for
  // neighboring days without fetching them, we show relative labels ("Yesterday", etc.)
  const NAV_LABELS_EN = ["2 Days Ago", "Yesterday", "Today", "Tomorrow", "In 2 Days"];
  const NAV_LABELS_HE = ["לפני יומיים", "אתמול", "היום", "מחר", "בעוד יומיים"];
  const NAV_OFFSETS = [-2, -1, 0, 1, 2];

  return (
    <>
      <ReaderNav
        dayHe={data?.hebrewDate.dayHe}
        monthHe={data?.hebrewDate.monthHe}
        fullHe={data?.hebrewDate.fullHe}
      />

      {/* Hero Section */}
      <HeroSection totalStories={data?.totalForToday} />

      <main id="daily-stories" className="mx-auto max-w-[800px] px-6 pb-16 pt-8 md:px-4 md:py-6 sm:px-3 sm:pb-10">

        {/* ═══ DATE NAVIGATION ═══ */}
        <nav
          className="mb-6 flex items-center justify-between gap-1 rounded-2xl bg-(--reader-surface) p-1.5 shadow-sm"
          aria-label="Navigate by date"
          dir="ltr"
        >
          {/* Left arrow */}
          <button
            onClick={() => setDateOffset((o) => Math.max(-2, o - 1))}
            disabled={dateOffset <= -2}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-(--reader-text-muted) transition hover:bg-(--reader-surface-hover) disabled:opacity-25"
            aria-label="Previous day"
          >
            ‹
          </button>

          {/* Day tabs */}
          <div className="flex flex-1 gap-1">
            {NAV_OFFSETS.map((offset) => {
              const isActive = offset === dateOffset;
              const labelEn = NAV_LABELS_EN[offset + 2];
              const labelHe = NAV_LABELS_HE[offset + 2];
              // For the active offset, show the actual Hebrew date if we have it
              const activeDateLabel = isActive && data
                ? (isHe ? data.hebrewDate.displayHe : data.hebrewDate.displayEn)
                : null;

              return (
                <button
                  key={offset}
                  onClick={() => setDateOffset(offset)}
                  className={`flex flex-1 flex-col items-center rounded-xl px-1 py-1.5 text-center transition ${
                    isActive
                      ? "bg-(--reader-accent) text-(--reader-accent-foreground) shadow-sm"
                      : "text-(--reader-text-muted) hover:bg-(--reader-surface-hover)"
                  }`}
                >
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider opacity-75 sm:hidden"
                    style={fontFamilyStyle}
                  >
                    {isHe ? labelHe : labelEn}
                  </span>
                  <span
                    className="text-xs font-semibold leading-tight"
                    style={fontFamilyStyle}
                    dir={isHe ? "rtl" : "ltr"}
                  >
                    {activeDateLabel || (offset === 0 ? (isHe ? "היום" : "Today") : "")}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => setDateOffset((o) => Math.min(2, o + 1))}
            disabled={dateOffset >= 2}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg text-(--reader-text-muted) transition hover:bg-(--reader-surface-hover) disabled:opacity-25"
            aria-label="Next day"
          >
            ›
          </button>
        </nav>

        {/* Header */}
        <header className="mb-8 text-center md:mb-6 sm:mb-4">
          <h2
            className="mb-2 text-3xl font-bold tracking-tight text-(--reader-text) sm:text-2xl"
            style={fontFamilyStyle}
            dir={directionClass}
          >
            {dateOffset === 0
              ? (isHe ? "סיפורי היום" : "Today's Stories")
              : (isHe
                  ? `סיפורים ל${data?.hebrewDate.displayHe ?? "..."}`
                  : `Stories for ${data?.hebrewDate.displayEn ?? "..."}`)}
          </h2>
          {data && (
            <p
              className="text-base text-(--reader-text-muted) sm:text-sm"
              style={fontFamilyStyle}
              dir={directionClass}
            >
              {isHe
                ? `${data.hebrewDate.displayHe} • ${data.totalForToday} ${t("common.stories")}`
                : `${data.hebrewDate.displayEn} • ${data.totalForToday} ${t("common.stories")}`}
            </p>
          )}
        </header>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-4">
            <div className="mb-2 text-center text-(--reader-text-muted)">{t("common.loading")}</div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[140px] animate-pulse rounded-2xl bg-linear-to-r from-(--reader-surface) via-[color-mix(in_oklch,var(--reader-surface)_70%,var(--reader-text-muted))] to-(--reader-surface) bg-size-[200%_100%] sm:h-[120px] sm:rounded-xl"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-12 text-center text-(--reader-text-muted)">
            <p className="mb-2 text-lg font-medium">{t("common.errorLoading")}</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* No stories */}
        {!loading && !error && data && data.stories.length === 0 && (
          <div className="py-16 text-center text-(--reader-text-muted)">
            <p
              className="mb-3 text-xl font-medium sm:text-lg"
              style={fontFamilyStyle}
              dir={directionClass}
            >
              {t("common.noStories")}
            </p>
            <p
              className="text-base sm:text-sm"
              style={fontFamilyStyle}
              dir={directionClass}
            >
              {isHe
                ? `${data.hebrewDate.displayHe} — ${t("common.checkTomorrow")}`
                : `${data.hebrewDate.displayEn} — ${t("common.checkTomorrow")}`}
            </p>
          </div>
        )}

        {/* ═══ STORIES ROW ═══ */}
        {!loading && !error && data && data.stories.length > 0 && (
          <section className="mt-2">
            <h2
              className="text-lg font-bold mb-4 px-1 text-(--reader-text) flex items-center gap-2"
              style={fontFamilyStyle}
              dir={directionClass}
            >
              <span>📅</span>
              {isHe
                ? `סיפורי ${data.hebrewDate.displayHe}`
                : `Stories for ${data.hebrewDate.displayEn}`}
            </h2>
            <div className="flex overflow-x-auto gap-3 pb-3 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--reader-text-muted)/30">
              {data.stories.map((story) => (
                <div key={story.story_id} className="snap-start">
                  <PosterCard
                    storyId={story.story_id}
                    titleHe={story.title_he}
                    titleEn={story.title_en}
                    rabbiHe={story.rabbi_he}
                    rabbiEn={story.rabbi_en}
                    dateHe={story.date_he}
                    dateEn={story.date_en}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ RECENTLY ADDED ROW ═══ */}
        <StoryRibbon
          apiUrl="/api/stories/trending"
          titleEn="Recently Added"
          titleHe="סיפורים חדשים"
          icon="🆕"
        />

        {/* ═══ HOLIDAYS ROW ═══ */}
        <StoryRibbon
          apiUrl="/api/stories/holidays"
          titleEn="For the Holidays"
          titleHe="לחגים ולמועדים"
          icon="🕍"
        />

      </main>
    </>
  );
}
