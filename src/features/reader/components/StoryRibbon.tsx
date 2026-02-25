"use client";

import { useEffect, useState } from "react";
import PosterCard from "./PosterCard";
import { useLanguage } from "../context/LanguageContext";

interface Story {
  story_id: string;
  rabbi_he: string | null;
  rabbi_en: string | null;
  date_he: string;
  date_en: string;
  title_en: string | null;
  title_he: string | null;
}

interface StoryRibbonProps {
  /** API endpoint to fetch stories from, e.g. "/api/stories/trending" */
  apiUrl: string;
  /** Title shown above the ribbon row */
  titleEn: string;
  titleHe: string;
  /** Emoji icon next to the title */
  icon?: string;
}

export default function StoryRibbon({ apiUrl, titleEn, titleHe, icon = "🎬" }: StoryRibbonProps) {
  const { isHe } = useLanguage();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStories() {
      try {
        const res = await fetch(apiUrl);
        const data = await res.json();
        if (data.stories) setStories(data.stories);
      } catch (e) {
        console.error("Failed to fetch ribbon:", apiUrl, e);
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, [apiUrl]);

  // Don't render anything if empty after loading
  if (!loading && stories.length === 0) return null;

  const title = isHe ? titleHe : titleEn;

  return (
    <section className="my-10">
      {/* Row title */}
      <h2
        className="text-lg font-bold mb-4 px-1 text-(--reader-text) flex items-center gap-2"
        style={{
          fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
        }}
        dir={isHe ? "rtl" : "ltr"}
      >
        <span>{icon}</span>
        {title}
      </h2>

      {loading ? (
        /* Skeleton loader — 5 placeholder cards */
        <div className="flex gap-3 overflow-hidden pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex-none w-[220px] sm:w-[180px] rounded-xl animate-pulse bg-(--reader-surface)"
              style={{ aspectRatio: "16/9" }}
            />
          ))}
        </div>
      ) : (
        /* Horizontal scrolling row */
        <div className="flex overflow-x-auto gap-3 pb-3 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--reader-text-muted)/30">
          {stories.map((story) => (
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
      )}
    </section>
  );
}
