"use client";

import { useState } from "react";
import { useLanguage } from "@/features/reader/context/LanguageContext";
import { useAuth } from "@/features/reader/context/AuthContext";
import AuthModal from "./AuthModal";
import { Lock, ArrowRight, X, Gem, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js';

// Initialize Stripe outside component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

type PremiumGateModalProps = {
  isOpen: boolean;
  onClose?: () => void;
};

export default function PremiumGateModal({ isOpen, onClose }: PremiumGateModalProps) {
  const { isHe } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  if (!isOpen) return null;

  const dir = isHe ? "rtl" : "ltr";
  const fontFamily = isHe ? "var(--font-hebrew-body)" : "var(--font-serif-en)";
  const titleFont = isHe ? "var(--font-hebrew)" : "var(--font-serif-en)";

  const handleSubscribeClick = async () => {
    if (!user) {
      setIsAuthOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email })
      });
      if (!res.ok) throw new Error("Failed to create checkout session");
      
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      }
    } catch (err) {
      console.error(err);
      alert(isHe ? "שגיאה בחיבור למערכת התשלומים" : "Error connecting to checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-(--reader-surface) shadow-2xl animate-in zoom-in-95 duration-300"
        dir={dir}
        style={{ fontFamily }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--reader-accent)/10 rounded-full blur-3xl -mr-10 -mt-10" />

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

          {/* If we have a clientSecret from Stripe, show the embedded form. Otherwise, show our marketing UI */}
          {clientSecret ? (
            <div className="mt-8 text-left" dir="ltr">
               <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{clientSecret}}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-(--reader-accent)/10 text-(--reader-accent)">
                <Gem className="h-8 w-8" strokeWidth={1.5} />
              </div>

              <h2 
                className="mb-3 text-3xl font-bold text-(--reader-text)"
                style={{ fontFamily: titleFont }}
              >
                {isHe ? "עברת את המכסה היומית שלך" : "You've reached your daily limit"}
              </h2>
              
              <p className="mb-6 text-base text-(--reader-text-muted) leading-relaxed">
                {isHe 
                  ? "מקווים שאתה נהנה מסיפוריא! הצטרף לפרמיום ותהנה מגישה בלתי מוגבלת ללמעלה מ-20,000 סיפורים יומיים, ללא הגבלה וללא פרסומות."
                  : "We hope you are enjoying Sipuraya! Upgrade to Premium to unlock unlimited access to over 20,000 daily stories, ad-free and forever."}
              </p>

              <div className="mb-8 rounded-2xl bg-(--reader-accent)/5 p-4 border border-(--reader-accent)/20 text-center">
                <p className="text-xl font-bold text-(--reader-text)" style={{ fontFamily: titleFont }}>
                  {isHe ? "$5.00 / חודש" : "$5.00 / month"}
                </p>
                <p className="text-sm text-(--reader-text-muted) mt-1">
                  {isHe ? "ניתן לבטל בכל עת" : "Cancel anytime"}
                </p>
              </div>

              <Button
                onClick={handleSubscribeClick}
                disabled={loading}
                className="w-full rounded-2xl bg-(--reader-accent) py-6 text-lg font-bold text-(--reader-accent-foreground) shadow-lg hover:bg-(--reader-accent)/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-5 w-5 mr-1" />
                    {isHe ? "לחץ כאן לשדרוג" : "Unlock Premium Now"}
                    <ArrowRight className={`h-5 w-5 ${isHe ? "rotate-180" : ""}`} />
                  </span>
                )}
              </Button>

              <p className="mt-6 text-xs text-(--reader-text-muted)/70">
                {isHe 
                  ? "תשלום מאובטח באמצעות Stripe"
                  : "Secure checkout powered by Stripe"}
              </p>
            </>
          )}
        </div>
      </div>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
