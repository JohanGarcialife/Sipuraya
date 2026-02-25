"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "@/features/reader/context/LanguageContext";

interface HeroSectionProps {
  totalStories?: number;
}

export default function HeroSection({ totalStories }: HeroSectionProps) {
  const { isHe } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [surpriseLoading, setSurpriseLoading] = useState(false);

  const dir = isHe ? "rtl" : "ltr";
  const hebrewFont = { fontFamily: "var(--font-hebrew), serif" };
  const englishFont = { fontFamily: "var(--font-serif-en), serif" };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/read/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleSurprise = async () => {
    setSurpriseLoading(true);
    try {
      const res = await fetch("/api/stories/random");
      if (!res.ok) throw new Error("Failed");
      const { story_id } = await res.json();
      router.push(`/read/${story_id}`);
    } catch {
      setSurpriseLoading(false);
    }
  };

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: "420px" }}>
      {/* Background Hero Image */}
      <div className="absolute inset-0">
        <Image
          src="/heroImage.jpeg"
          alt="Purim celebration — Sipuraya"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Gradient overlay — bottom-heavy for text readability */}
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/10" />
      </div>

      {/* Overlay Content */}
      <div
        className="relative z-10 flex min-h-[420px] flex-col items-center justify-end pb-12 px-4 text-center"
        dir={dir}
      >
        {/* Title */}
        <h1
          className="mb-2 text-4xl font-bold text-white drop-shadow-lg sm:text-3xl"
          style={isHe ? hebrewFont : englishFont}
        >
          {isHe ? "סיפוריא" : "Sipuraya"}
        </h1>

        {/* Subtitle */}
        <p
          className="mb-8 max-w-xl text-base text-white/85 drop-shadow sm:text-sm sm:mb-5"
          style={isHe ? hebrewFont : englishFont}
        >
          {isHe
            ? "סיפורים יומיים מגדולי ישראל"
            : "Daily stories from the great sages of Israel"}
          {totalStories && (
            <span className="block mt-1 text-sm text-white/60">
              {isHe
                ? `${totalStories.toLocaleString()} סיפורים ואגדות`
                : `${totalStories.toLocaleString()} stories & tales`}
            </span>
          )}
        </p>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="mb-4 flex w-full max-w-md items-center gap-2 sm:flex-col sm:max-w-xs"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isHe ? "חפש סיפור, רב, תאריך..." : "Search story, rabbi, date..."}
            dir={dir}
            className="flex-1 rounded-xl border border-white/30 bg-white/15 px-4 py-3 text-sm text-white placeholder-white/60 backdrop-blur-md outline-none transition focus:bg-white/25 focus:border-white/60 sm:w-full"
            style={isHe ? hebrewFont : englishFont}
          />
          <button
            type="submit"
            className="rounded-xl bg-(--reader-accent) px-5 py-3 text-sm font-semibold text-(--reader-accent-foreground) shadow-lg transition hover:opacity-90 active:scale-95 sm:w-full"
          >
            {isHe ? "חיפוש" : "Search"}
          </button>
        </form>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3 sm:flex-col sm:w-full sm:max-w-xs">
          <button
            onClick={() => {
              const el = document.getElementById("daily-stories");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-xl bg-white/90 px-6 py-2.5 text-sm font-semibold text-gray-900 shadow transition hover:bg-white active:scale-95 sm:w-full"
          >
            {isHe ? "📖 קרא עכשיו" : "📖 Start Reading"}
          </button>

          <button
            onClick={handleSurprise}
            disabled={surpriseLoading}
            className="rounded-xl border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 disabled:opacity-60 sm:w-full"
          >
            {surpriseLoading
              ? (isHe ? "טוען..." : "Loading...")
              : (isHe ? "🎲 הפתע אותי" : "🎲 Surprise Me")}
          </button>
        </div>
      </div>
    </section>
  );
}
