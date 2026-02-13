"use client";

import { useState, useEffect } from "react";
import ReaderNav from "@/features/reader/components/ReaderNav";
import StoryCard from "@/features/reader/components/StoryCard";
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

export default function ReadPage() {
  const { language, isHe, t } = useLanguage();
  const [data, setData] = useState<DailyStoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch("/api/daily-stories?count=5");
        if (!res.ok) throw new Error("Failed to fetch stories");
        const json: DailyStoriesResponse = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  const fontFamilyStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };
  const directionClass = isHe ? "rtl" : "ltr";

  return (
    <>
      <ReaderNav
        dayHe={data?.hebrewDate.dayHe}
        monthHe={data?.hebrewDate.monthHe}
        fullHe={data?.hebrewDate.fullHe}
      />

      <main className="mx-auto max-w-[800px] px-6 pb-16 pt-8 md:px-4 md:py-6 sm:px-3 sm:pb-10">
        {/* Header */}
        <header className="mb-10 text-center md:mb-8 sm:mb-6">
          <h1
            className="mb-2 text-3xl font-bold tracking-tight text-[var(--reader-text)] sm:text-2xl"
            style={fontFamilyStyle}
            dir={directionClass}
          >
            {isHe ? "סיפורי היום" : "Today's Stories"}
          </h1>
          {data && (
            <p
              className="text-base text-[var(--reader-text-muted)] sm:text-sm"
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
            <div className="mb-2 text-center text-[var(--reader-text-muted)]">{t("common.loading")}</div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[140px] animate-pulse rounded-2xl bg-linear-to-r from-[var(--reader-surface)] via-[color-mix(in_oklch,var(--reader-surface)_70%,var(--reader-text-muted))] to-[var(--reader-surface)] bg-[length:200%_100%] sm:h-[120px] sm:rounded-xl"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-12 text-center text-[var(--reader-text-muted)]">
            <p className="mb-2 text-lg font-medium">
              {t("common.errorLoading")}
            </p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* No stories */}
        {!loading && !error && data && data.stories.length === 0 && (
          <div className="py-16 text-center text-[var(--reader-text-muted)]">
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

        {/* Story Cards */}
        {!loading && !error && data && data.stories.length > 0 && (
          <div className="flex flex-col gap-4 sm:gap-3">
            {data.stories.map((story) => (
              <StoryCard
                key={story.story_id}
                storyId={story.story_id}
                titleHe={story.title_he}
                titleEn={story.title_en}
                rabbiHe={story.rabbi_he}
                rabbiEn={story.rabbi_en}
                bodyHe={story.body_he}
                bodyEn={story.body_en}
                dateHe={story.date_he}
                dateEn={story.date_en}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
