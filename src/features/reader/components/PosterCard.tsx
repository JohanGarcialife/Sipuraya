"use client";

import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";
import { applyGeresh } from "@/lib/hebrewUtils";

// Deterministic gradient pool based on story_id hash
const GRADIENTS = [
  "from-amber-900 via-amber-700 to-orange-600",
  "from-indigo-900 via-indigo-700 to-purple-600",
  "from-emerald-900 via-emerald-700 to-teal-600",
  "from-rose-900 via-rose-700 to-pink-600",
  "from-slate-800 via-slate-700 to-zinc-600",
  "from-yellow-900 via-amber-800 to-yellow-600",
  "from-sky-900 via-sky-700 to-blue-600",
  "from-red-900 via-red-700 to-rose-600",
  "from-violet-900 via-violet-700 to-fuchsia-600",
  "from-green-900 via-green-700 to-emerald-500",
];

function getGradient(storyId: string): string {
  let hash = 0;
  for (let i = 0; i < storyId.length; i++) {
    hash = (hash * 31 + storyId.charCodeAt(i)) & 0xffffff;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

// Decorative Hebrew letter watermark (based on story_id)
const WATERMARKS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י"];
function getWatermark(storyId: string): string {
  let hash = 0;
  for (let i = 0; i < storyId.length; i++) hash = (hash + storyId.charCodeAt(i)) & 0xff;
  return WATERMARKS[hash % WATERMARKS.length];
}

interface PosterCardProps {
  storyId: string;
  titleHe: string | null;
  titleEn: string | null;
  rabbiHe: string | null;
  rabbiEn: string | null;
  dateHe: string;
  dateEn: string;
}

export default function PosterCard({
  storyId,
  titleHe,
  titleEn,
  rabbiHe,
  rabbiEn,
  dateHe,
  dateEn,
}: PosterCardProps) {
  const { isHe } = useLanguage();

  const title = isHe ? titleHe : titleEn;
  const rabbi = isHe ? rabbiHe : rabbiEn;
  const gradient = getGradient(storyId);
  const watermark = getWatermark(storyId);

  const titleFont = {
    fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif",
  };
  const bodyFont = {
    fontFamily: isHe
      ? "var(--font-hebrew-body), var(--font-hebrew), sans-serif"
      : "var(--font-serif-en), serif",
  };

  return (
    <Link href={`/read/${storyId}`} className="block no-underline flex-none w-[220px] sm:w-[180px]">
      <article
        className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-2xl hover:shadow-black/40 hover:z-10"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-linear-to-br ${gradient}`} />

        {/* Decorative watermark letter */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-10 select-none pointer-events-none"
          style={{ fontFamily: "var(--font-hebrew), serif" }}
        >
          <span className="text-[8rem] font-black text-white leading-none">{watermark}</span>
        </div>

        {/* Subtle noise texture overlay */}
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Content overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-3 bg-linear-to-t from-black/90 via-black/50 to-transparent">
          {/* Title */}
          <h3
            className="text-white text-sm font-bold leading-snug line-clamp-2 mb-1 drop-shadow"
            style={titleFont}
            dir={isHe ? "rtl" : "ltr"}
          >
            {applyGeresh(title, isHe) || (isHe ? "(ללא כותרת)" : "(Untitled)")}
          </h3>

          {/* Rabbi */}
          {rabbi && (
            <p
              className="text-white/70 text-[0.65rem] font-medium truncate"
              style={bodyFont}
              dir={isHe ? "rtl" : "ltr"}
            >
              {applyGeresh(rabbi, isHe)}
            </p>
          )}
        </div>

        {/* Top-right date badge */}
        <div
          className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[0.6rem] text-white/80 font-medium"
          style={bodyFont}
        >
          {isHe ? applyGeresh(dateHe, true) : dateEn}
        </div>
      </article>
    </Link>
  );
}
