"use client";

import LanguageToggle from "./LanguageToggle";
import HebrewDateBadge from "./HebrewDateBadge";
import ThemeToggle from "./ThemeToggle";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { UserCircle } from "lucide-react";

type ReaderNavProps = {
  dayHe?: string;
  monthHe?: string;
  fullHe?: string;
};

export default function ReaderNav({
  dayHe,
  monthHe,
  fullHe,
}: ReaderNavProps) {
  const { language, setLanguage } = useLanguage();
  const { user, isLoading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const supabase = createSupabaseBrowserClient();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-[color-mix(in_oklch,var(--reader-bg)_85%,transparent)] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-[900px] items-center justify-between px-6 py-3 md:px-4 md:py-2.5 sm:px-3 sm:py-2">
        {/* Logo */}
        <Link href="/read" className="flex items-center gap-2">
          <span
            className="text-2xl font-bold tracking-wide text-[var(--reader-accent)] md:text-xl sm:text-lg"
            style={{ fontFamily: "var(--font-hebrew), serif" }}
          >
            סיפוריא
          </span>
          <span
            className="text-sm italic text-[var(--reader-text-muted)] md:hidden"
            style={{ fontFamily: "var(--font-serif-en), serif" }}
          >
            Sipuraya
          </span>
        </Link>

        {/* Hebrew date */}
        <div className="flex items-center gap-3">
          {dayHe && monthHe && (
            <HebrewDateBadge dayHe={dayHe} monthHe={monthHe} />
          )}
        </div>

        {/* Language toggle + Theme toggle + About */}
        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm font-medium text-(--reader-text-muted) transition-colors hover:text-(--reader-accent) hidden md:block"
            style={{ fontFamily: "var(--font-hebrew-body), sans-serif" }}
          >
            {language === "he" ? "אודות" : "About"}
          </Link>
          <div className="flex items-center gap-2">
            {!isLoading && user ? (
              <Link
                href="/profile"
                className="flex items-center gap-1 rounded-full p-2 text-sm font-medium text-(--reader-text-muted) transition-colors hover:bg-(--reader-accent)/10 hover:text-(--reader-accent)"
                title={language === "he" ? "הפרופיל שלי" : "My Profile"}
              >
                <UserCircle className="h-5 w-5" />
              </Link>
            ) : (
              <button
                 onClick={() => setIsAuthOpen(true)}
                 className="flex items-center gap-1 rounded-full p-2 text-sm font-medium text-(--reader-text-muted) transition-colors hover:bg-(--reader-accent)/10 hover:text-(--reader-accent)"
                 title={language === "he" ? "התחברות" : "Sign In"}
              >
                <UserCircle className="h-5 w-5" />
              </button>
            )}
            <ThemeToggle />
            <LanguageToggle language={language} onToggle={setLanguage} />
          </div>
        </div>
      </div>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </nav>
  );
}
