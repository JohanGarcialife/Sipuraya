"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReaderNav from "@/features/reader/components/ReaderNav";
import StoryReader from "@/features/reader/components/StoryReader";
import { useLanguage } from "@/features/reader/context/LanguageContext";

type Story = {
  story_id: string;
  title_he: string | null;
  title_en: string | null;
  rabbi_he: string | null;
  rabbi_en: string | null;
  body_he: string | null;
  body_en: string | null;
  date_he?: string;
  date_en?: string;
  likes_count: number;
};

type HebrewDate = {
  dayHe: string;
  monthHe: string;
  fullHe: string;
};

export default function StoryPage() {
  const params = useParams();
  const router = useRouter();
  const { language, isHe, t } = useLanguage();
  const [story, setStory] = useState<Story | null>(null);
  const [hebrewDate, setHebrewDate] = useState<HebrewDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch story
        const storyRes = await fetch(`/api/stories/${params.id}`);
        if (!storyRes.ok) throw new Error("Story not found");
        const storyData = await storyRes.json();
        // API returns { story: {...} }, so unwrap it
        setStory(storyData.story ?? storyData);

        // Fetch Hebrew date
        const dateRes = await fetch("/api/hebrew-date");
        if (dateRes.ok) {
          const dateData = await dateRes.json();
          setHebrewDate(dateData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  const fontFamilyStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };
  const directionClass = isHe ? "rtl" : "ltr";

  return (
    <>
      <ReaderNav
        dayHe={hebrewDate?.dayHe}
        monthHe={hebrewDate?.monthHe}
        fullHe={hebrewDate?.fullHe}
      />

      <main className="mx-auto max-w-[800px] px-6 pb-16 pt-8 md:px-4 md:py-6 sm:px-3 sm:pb-10">
        {/* Back Button */}
        <div className="mb-8 sm:mb-6">
          <Link
            href="/read"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--reader-text-muted)] transition-colors hover:text-[var(--reader-accent)]"
            style={fontFamilyStyle}
            dir={directionClass}
          >
            {t("common.back")}
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-6">
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-[var(--reader-surface)]" />
            <div className="h-6 w-1/2 animate-pulse rounded-lg bg-[var(--reader-surface)]" />
            <div className="space-y-3 pt-4">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--reader-surface)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--reader-surface)]" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-[var(--reader-surface)]" />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-20 text-center">
            <p className="text-lg text-[var(--reader-text-muted)]">{t("common.storyNotFound")}</p>
            <Link
              href="/read"
              className="mt-4 inline-block text-[var(--reader-accent)] hover:underline"
            >
              {t("common.back")}
            </Link>
          </div>
        )}

        {/* Story */}
        {!loading && !error && story && (
          <StoryReader
            storyId={story.story_id}
            title={isHe ? story.title_he : story.title_en}
            rabbi={isHe ? story.rabbi_he : story.rabbi_en}
            body={isHe ? story.body_he : story.body_en}
            date={isHe ? story.date_he : story.date_en}
            initialLikes={story.likes_count}
          />
        )}
      </main>
    </>
  );
}
