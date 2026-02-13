"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { useChat } from "../context/ChatContext";
import { useLanguage } from "../../reader/context/LanguageContext";

export default function PasscodeScreen() {
  const { unlock } = useChat();
  const { t, isHe } = useLanguage();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unlock(passcode)) {
      setError(false);
    } else {
      setError(true);
      setPasscode("");
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--reader-surface)] text-[var(--reader-accent)] shadow-sm">
        <Lock size={32} />
      </div>

      <h2
        className="mb-2 text-xl font-bold text-[var(--reader-text)]"
        style={{ fontFamily: isHe ? "var(--font-hebrew), serif" : "var(--font-serif-en), serif" }}
      >
        {t("passcode.title")}
      </h2>
      <p className="mb-8 text-sm text-[var(--reader-text-muted)]">
        {t("passcode.subtitle")}
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-[240px]">
        <input
          type="password"
          value={passcode}
          onChange={(e) => {
            setPasscode(e.target.value);
            setError(false);
          }}
          placeholder={t("passcode.placeholder")}
          className={`mb-4 w-full rounded-lg border bg-[var(--reader-bg)] px-4 py-3 text-center text-lg font-medium tracking-widest outline-none transition-all focus:ring-2 ${
            error
              ? "border-red-500 focus:ring-red-200"
              : "border-border focus:border-[var(--reader-accent)] focus:ring-[var(--reader-accent)]/20"
          }`}
          autoFocus
          dir="ltr" 
        />

        {error && (
          <p className="mb-4 text-xs font-medium text-red-500">
            {t("passcode.error")}
          </p>
        )}

        <button
          type="submit"
          className="w-full cursor-pointer rounded-lg bg-[var(--reader-accent)] py-3 font-bold text-[var(--reader-accent-foreground)] transition-transform active:scale-95"
        >
          {t("passcode.button")}
        </button>
      </form>
    </div>
  );
}
