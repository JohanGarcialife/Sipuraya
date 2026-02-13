
"use client";

import { useEffect, useState } from "react";
import StoryCard from "./StoryCard";

interface Story {
  story_id: string;
  rabbi_he: string | null;
  rabbi_en: string | null;
  date_he: string;
  date_en: string;
  title_en: string | null;
  title_he: string | null;
  body_en: string | null;
  body_he: string | null;
  tags: string[];
}

interface SeriesRibbonProps {
  seriesName: string;
  title?: string; // Optional display title (defaults to seriesName)
}

export default function SeriesRibbon({ seriesName, title }: SeriesRibbonProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSeries() {
      try {
        const res = await fetch(`/api/stories/series?name=${encodeURIComponent(seriesName)}`);
        const data = await res.json();
        if (data.stories) {
          setStories(data.stories);
        }
      } catch (e) {
        console.error("Failed to fetch series:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchSeries();
  }, [seriesName]);

  if (loading) return <div className="h-64 animate-pulse bg-(--reader-surface)/50 rounded-xl my-6" />;
  if (stories.length === 0) return null; // Don't show empty ribbons

  return (
    <div className="my-8">
      <h2 className="text-xl font-bold mb-4 px-4 text-(--reader-text)">
        {title || seriesName}
      </h2>
      
      {/* Horizontal Scroll Container */}
      <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory scrollbar-hide">
        {stories.map((story) => (
          <div key={story.story_id} className="flex-none w-[300px] snap-center">
             <StoryCard 
                storyId={story.story_id}
                titleEn={story.title_en}
                titleHe={story.title_he}
                bodyEn={story.body_en}
                bodyHe={story.body_he}
                rabbiEn={story.rabbi_en}
                rabbiHe={story.rabbi_he}
                dateHe={story.date_he}
                dateEn={story.date_en}
             />
          </div>
        ))}
      </div>
    </div>
  );
}
