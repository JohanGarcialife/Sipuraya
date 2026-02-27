"use client";

import { useState } from "react";
import { useLanguage } from "@/features/reader/context/LanguageContext";
import { Mail, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmailGateModalProps = {
  isOpen: boolean;
  onSuccess: () => void;
  onClose?: () => void;
};

export default function EmailGateModal({ isOpen, onSuccess, onClose }: EmailGateModalProps) {
  const { isHe } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setError(isHe ? "כתובת אימייל לא תקינה" : "Invalid email address");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "search_gate" }),
      });

      if (!res.ok) {
        throw new Error("Failed to subscribe");
      }

      onSuccess();
    } catch (err) {
      setError(
        isHe
          ? "אירעה שגיאה. אנא נסה שוב מאוחר יותר."
          : "An error occurred. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const dir = isHe ? "rtl" : "ltr";
  const fontFamily = isHe ? "var(--font-hebrew-body)" : "var(--font-serif-en)";
  const titleFont = isHe ? "var(--font-hebrew)" : "var(--font-serif-en)";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md overflow-hidden rounded-3xl bg-(--reader-surface) shadow-2xl animate-in zoom-in-95 duration-300"
        dir={dir}
        style={{ fontFamily }}
      >
        <div className="relative p-8 md:p-6 text-center">
          
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className={`absolute top-4 ${isHe ? "left-4" : "right-4"} rounded-full p-2 text-(--reader-text-muted) transition-colors hover:bg-(--reader-accent)/10 hover:text-(--reader-accent)`}
              aria-label={isHe ? "סגור" : "Close"}
            >
              <X className="h-5 w-5" />
            </button>
          )}

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-(--reader-accent)/10 text-(--reader-accent)">
            <Mail className="h-8 w-8" strokeWidth={1.5} />
          </div>

          <h2 
            className="mb-3 text-3xl font-bold text-(--reader-text)"
            style={{ fontFamily: titleFont }}
          >
            {isHe ? "רוצה להמשיך לחפש?" : "Want to keep searching?"}
          </h2>
          
          <p className="mb-8 text-base text-(--reader-text-muted) leading-relaxed">
            {isHe 
              ? "הכנס את כתובת האימייל שלך כדי לפתוח חיפושים ללא הגבלה ולהצטרף לקהילת סיפוריא."
              : "Enter your email address to unlock unlimited searches and join the Sipuraya community."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-left" dir={dir}>
            <div className="relative">
              <input
                type="email"
                placeholder={isHe ? "כתובת האימייל שלך..." : "Your email address..."}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-base text-(--reader-text) placeholder:text-(--reader-text-muted)/60 focus:border-(--reader-accent) focus:outline-none focus:ring-1 focus:ring-(--reader-accent) transition-all disabled:opacity-50"
              />
            </div>
            
            {error && (
              <p className={`text-sm text-red-500 ${isHe ? "text-right" : "text-left"}`}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-2xl bg-(--reader-accent) py-6 text-lg font-bold text-(--reader-accent-foreground) shadow-lg hover:bg-(--reader-accent)/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isHe ? "המשך" : "Continue"}
                  <ArrowRight className={`h-5 w-5 ${isHe ? "rotate-180" : ""}`} />
                </span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-xs text-(--reader-text-muted)/70">
            {isHe 
              ? "לעולם לא נשלח ספאם. ניתן לבטל הרשמה בכל עת."
              : "We'll never spam you. Unsubscribe at any time."}
          </p>
        </div>
      </div>
    </div>
  );
}
