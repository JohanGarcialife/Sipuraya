"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/features/reader/context/LanguageContext";
import ReaderNav from "@/features/reader/components/ReaderNav";
import PosterCard from "@/features/reader/components/PosterCard";
import EmailGateModal from "@/features/reader/components/EmailGateModal";
import { Bot, Loader2, SearchX, UserCircle } from "lucide-react";

type StoryResult = {
  story_id: string;
  title_he: string | null;
  title_en: string | null;
  rabbi_he: string | null;
  rabbi_en: string | null;
  date_he?: string;
  date_en?: string;
};

function SearchContent() {
  const { isHe, t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";

  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [stories, setStories] = useState<StoryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [gateOpen, setGateOpen] = useState(false);
  const [rabbisList, setRabbisList] = useState<string[]>([]);
  const [fetchingRabbis, setFetchingRabbis] = useState(true);

  // Fetch Rabbi list once
  useEffect(() => {
    async function fetchRabbis() {
      try {
        const res = await fetch("/api/rabbis/unique");
        if (res.ok) {
          const data = await res.json();
          // Use Hebrew names if in Hebrew mode
          setRabbisList(isHe ? data.hebrew : data.english);
        }
      } catch (e) {
        console.error("Failed to fetch rabbis", e);
      } finally {
        setFetchingRabbis(false);
      }
    }
    fetchRabbis();
  }, [isHe]);

  // Main search effect
  useEffect(() => {
    if (!q) {
      setLoading(false);
      return;
    }

    // Email Gate Logic
    const isUnlocked = localStorage.getItem("sipuraya_search_unlocked");
    if (!isUnlocked) {
      const currentCount = parseInt(localStorage.getItem("sipuraya_search_count") || "0");
      
      // If they already did 2 searches, block them
      if (currentCount >= 2) {
        setGateOpen(true);
        setLoading(false);
        return;
      }
      
      // Otherwise increment and save
      localStorage.setItem("sipuraya_search_count", (currentCount + 1).toString());
    }

    // Perform Search
    async function performSearch() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/search/vector", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });

        if (!res.ok) throw new Error("Search failed");
        
        const data = await res.json();
        setAiAnswer(data.answer);
        setStories(data.stories || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [q]);

  const handleGateSuccess = () => {
    localStorage.setItem("sipuraya_search_unlocked", "true");
    setGateOpen(false);
    // Refresh to trigger search
    window.location.reload();
  };

  const dir = isHe ? "rtl" : "ltr";
  const fontFamilyStyle = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };
  const bodyFontStyle = {
    fontFamily: isHe
      ? "var(--font-hebrew-body), var(--font-hebrew), sans-serif"
      : "var(--font-serif-en), serif",
  };

  return (
    <>
      <EmailGateModal isOpen={gateOpen} onSuccess={handleGateSuccess} onClose={() => setGateOpen(false)} />
      
      <main className="mx-auto max-w-4xl px-6 py-12 md:px-4 sm:px-3 animate-in fade-in duration-500">
        
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/read"
            className="inline-flex items-center gap-2 text-sm font-medium text-(--reader-text-muted) transition-colors hover:text-(--reader-accent)"
            style={fontFamilyStyle}
            dir={dir}
          >
            {t("common.back")}
          </Link>
        </div>

        {/* Search Header & Filters */}
        <div className="mb-10 flex flex-col gap-6 border-b border-border pb-6" dir={dir}>
          {q ? (
            <h1 className="text-3xl font-bold text-(--reader-text) md:text-2xl" style={fontFamilyStyle}>
              {isHe ? "תוצאות חיפוש עבור" : "Search results for"} <span className="text-(--reader-accent)">"{q}"</span>
            </h1>
          ) : (
            <h1 className="text-3xl font-bold text-(--reader-text) md:text-2xl" style={fontFamilyStyle}>
              {isHe ? "חיפוש סיפורים" : "Search Stories"}
            </h1>
          )}

          {/* Search by Rabbi Dropdown */}
          <div className="flex w-full max-w-sm flex-col gap-2">
            <label className="text-sm font-semibold text-(--reader-text-muted)" style={bodyFontStyle}>
              {isHe ? "סנן לפי רב (א-ת):" : "Filter by Rabbi (A-Z):"}
            </label>
            <div className="relative">
              <UserCircle className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 text-(--reader-text-muted) ${isHe ? 'right-3' : 'left-3'}`} />
              <select
                className={`w-full appearance-none rounded-xl border border-border bg-(--reader-surface) py-3 text-sm text-(--reader-text) outline-none focus:border-(--reader-accent) focus:ring-1 focus:ring-(--reader-accent) ${isHe ? 'pl-3 pr-10' : 'pl-10 pr-3'}`}
                style={bodyFontStyle}
                dir={dir}
                disabled={fetchingRabbis}
                onChange={(e) => {
                  if (e.target.value) {
                    router.push(`/read/search?q=${encodeURIComponent(e.target.value)}`);
                  }
                }}
                value=""
              >
                <option value="" disabled>
                  {fetchingRabbis 
                    ? (isHe ? "טוען רבנים..." : "Loading rabbis...") 
                    : (isHe ? "בחר רב לחיפוש..." : "Select a rabbi to search...")}
                </option>
                {rabbisList.map((rabbiName) => (
                  <option key={rabbiName} value={rabbiName}>
                    {rabbiName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-(--reader-text-muted)">
            <Loader2 className="h-10 w-10 animate-spin text-(--reader-accent)" />
            <p className="mt-4" style={bodyFontStyle} dir={dir}>
              {isHe ? "הבינה המלאכותית מחפשת בסיפורים..." : "AI is searching through the archives..."}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-20 text-center" dir={dir}>
            <p className="text-lg text-red-500" style={bodyFontStyle}>{error}</p>
          </div>
        )}

        {/* AI Answer Card */}
        {!loading && !error && aiAnswer && (
          <div 
            className="mb-12 rounded-3xl border border-(--reader-accent)/20 bg-(--reader-accent)/5 p-8 md:p-6 shadow-sm relative overflow-hidden"
            dir={dir}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-(--reader-accent)/10 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--reader-accent) text-(--reader-accent-foreground) shadow-md">
                <Bot strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="mb-2 text-xl font-bold text-(--reader-accent)" style={fontFamilyStyle}>
                  {isHe ? "סיפוריא AI זיהה:" : "Sipuraya AI says:"}
                </h2>
                <div 
                  className="prose prose-lg text-(--reader-text) leading-relaxed"
                  style={bodyFontStyle}
                >
                  <p>{aiAnswer}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stories Grid */}
        {!loading && !error && stories.length > 0 && (
          <div dir={dir}>
            <h3 className="mb-6 text-2xl font-bold text-(--reader-text)" style={fontFamilyStyle}>
              {isHe ? "סיפורים רלוונטיים" : "Relevant Stories"}
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <Link key={story.story_id} href={`/read/${story.story_id}`} className="block transition-transform hover:-translate-y-1">
                  <PosterCard
                    storyId={story.story_id}
                    titleHe={story.title_he}
                    titleEn={story.title_en}
                    rabbiHe={story.rabbi_he}
                    rabbiEn={story.rabbi_en}
                    dateHe={story.date_he || ""}
                    dateEn={story.date_en || ""}
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && q && stories.length === 0 && !aiAnswer && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-70" dir={dir}>
            <SearchX className="mb-4 h-16 w-16 text-(--reader-text-muted)" />
            <h3 className="mb-2 text-2xl font-bold text-(--reader-text)" style={fontFamilyStyle}>
              {isHe ? "לא נמצאו סיפורים" : "No stories found"}
            </h3>
            <p className="text-(--reader-text-muted)" style={bodyFontStyle}>
              {isHe ? "נסה לחפש במילים אחרות או פחות ממוקדות" : "Try searching with different or less specific keywords"}
            </p>
          </div>
        )}
      </main>
    </>
  );
}

export default function SearchPage() {
  return (
    <>
      <ReaderNav />
      <Suspense fallback={<div className="p-20 text-center">Loading...</div>}>
        <SearchContent />
      </Suspense>
    </>
  );
}
