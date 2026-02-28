"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Language = "he" | "en";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isHe: boolean;
  t: (key: string) => string;
};

const translations = {
  he: {
    // Chat / Passcode
    "chat.title": "צ׳אט סיפוריא",
    "passcode.title": "אזור אישי מוגן",
    "passcode.subtitle": "אנא הכנס את קוד הגישה כדי להמשיך",
    "passcode.placeholder": "קוד גישה",
    "passcode.button": "כניסה",
    "passcode.error": "הקוד שגוי, נסה שוב",
    "chat.welcome": "שלום! איך אפשר לעזור היום?",
    "chat.inputPlaceholder": "כתוב הודעה...",
    // Common
    "common.back": "→ חזרה לסיפורים",
    "common.backHome": "חזרה לדף הראשי",
    "common.untitled": "(ללא כותרת)",
    "common.by": "מאת",
    "common.readMore": "קרא עוד",
    "common.stories": "סיפורים",
    "common.error": "שגיאה",
    "common.loading": "טוען...",
    "common.noStories": "אין סיפורים להיום",
    "common.checkTomorrow": "בדוק שוב מחר",
    "common.errorLoading": "שגיאה בטעינת הסיפורים",
    "common.storyNotFound": "הסיפור לא נמצא",
    "common.share": "שתף סיפור זה",
  },
  en: {
    // Chat / Passcode
    "chat.title": "Sipuraya Chat",
    "passcode.title": "Protected Area",
    "passcode.subtitle": "Please enter passcode to proceed",
    "passcode.placeholder": "Passcode",
    "passcode.button": "Enter",
    "passcode.error": "Incorrect code, try again",
    "chat.welcome": "Hello! How can I help you today?",
    "chat.inputPlaceholder": "Type a message...",
    // Common
    "common.back": "← Back to stories",
    "common.backHome": "Back to home",
    "common.untitled": "(Untitled)",
    "common.by": "By",
    "common.readMore": "Read more",
    "common.stories": "stories",
    "common.error": "Error",
    "common.loading": "Loading...",
    "common.noStories": "No stories for today",
    "common.checkTomorrow": "Check back tomorrow",
    "common.errorLoading": "Error loading stories",
    "common.storyNotFound": "Story not found",
    "common.share": "Share this story",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("he");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sipuraya_lang") as Language;
    if (stored === "en" || stored === "he") {
      setLanguage(stored);
    }
    setMounted(true);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem("sipuraya_lang", lang);
    }
  };

  const toggleLanguage = () => {
    handleSetLanguage(language === "he" ? "en" : "he");
  };

  // Skip rendering children until we synced with localStorage to avoid hydration mismatch
  if (!mounted) return null;

  const isHe = language === "he";

  const t = (key: string): string => {
    // @ts-ignore
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        toggleLanguage,
        isHe,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
