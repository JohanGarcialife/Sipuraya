"use client";

import Link from "next/link";
import { useLanguage } from "@/features/reader/context/LanguageContext";
import ReaderNav from "@/features/reader/components/ReaderNav";

export default function AboutPage() {
  const { isHe, t } = useLanguage();

  const directionClass = isHe ? "rtl" : "ltr";
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
      <ReaderNav />
      <main className="mx-auto max-w-3xl px-6 py-12 md:px-4 md:py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/read"
            className="inline-flex items-center gap-2 text-sm font-medium text-(--reader-text-muted) transition-colors hover:text-(--reader-accent)"
            style={fontFamilyStyle}
            dir={directionClass}
          >
            {t("common.back")}
          </Link>
        </div>

        {/* Content Container */}
        <div className="rounded-3xl bg-(--reader-surface) border border-border p-10 md:p-6 shadow-sm">
          <h1
            className="mb-8 text-4xl font-bold text-center text-(--reader-text)"
            style={fontFamilyStyle}
            dir={directionClass}
          >
            {isHe ? "אודות סיפוריא" : "About Sipuraya"}
          </h1>

          <div
            className={`prose prose-lg max-w-none ${isHe ? "text-right" : "text-left"}`}
            dir={directionClass}
            style={bodyFontStyle}
          >
            {isHe ? (
              <p className="text-xl leading-relaxed text-(--reader-text-muted)">
                <strong className="text-2xl text-(--reader-accent) mb-2 block">
                  המשימה שלנו:
                </strong>
                סיפוריא הוא הארכיון הדיגיטלי המקיף ביותר בעולם לסיפורי צדיקים. המשימה שלנו היא לשמר, להנגיש ולעשות דיגיטציה לחוכמה העמוקה וללקחים המוסריים הנמצאים ביותר מ-25,000 סיפורי חכמינו.
              </p>
            ) : (
              <p className="text-xl leading-relaxed text-(--reader-text-muted)">
                <strong className="text-2xl text-(--reader-accent) mb-2 block">
                  Our Mission:
                </strong>
                Sipuraya is the world’s most comprehensive digital archive of rabbinical stories. Our mission is to preserve, digitize, and make accessible the profound wisdom and moral lessons found in over 25,000 tales of our Sages.
              </p>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
