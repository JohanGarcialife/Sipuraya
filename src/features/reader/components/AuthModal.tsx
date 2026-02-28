"use client";

import { useState } from "react";
import { useLanguage } from "@/features/reader/context/LanguageContext";
import { X, Loader2, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { toast } from "sonner";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { isHe } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const supabase = createSupabaseBrowserClient();

  if (!isOpen) return null;

  const dir = isHe ? "rtl" : "ltr";
  const fontFamilyBody = isHe ? "var(--font-hebrew-body)" : "var(--font-serif-en)";
  const fontFamilyTitle = isHe ? "var(--font-hebrew)" : "var(--font-serif-en)";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
           toast.error(isHe ? "שגיאה בהתחברות: " + error.message : "Login Error: " + error.message);
        } else {
           toast.success(isHe ? "התחברת בהצלחה!" : "Successfully logged in!");
           onClose();
        }
      } else {
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: { origin: 'sipuraya_reader_app' }
            }
        });
        if (error) {
           toast.error(isHe ? "שגיאה בהרשמה: " + error.message : "Signup Error: " + error.message);
        } else {
           toast.success(isHe ? "נרשמת בהצלחה! (אנא בדוק את תיבת הדוא\"ל שלך)" : "Successfully signed up! (Please check your email)");
           onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-(--reader-surface) shadow-2xl animate-in zoom-in-95 duration-300"
        dir={dir}
        style={{ fontFamily: fontFamilyBody }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--reader-accent)/10 rounded-full blur-3xl -mr-10 -mt-10" />

        <div className="relative p-8 md:p-6 text-center">
          
          <button
            onClick={onClose}
            className={`absolute top-4 ${isHe ? "left-4" : "right-4"} rounded-full p-2 text-(--reader-text-muted) transition-colors hover:bg-(--reader-accent)/10 hover:text-(--reader-accent)`}
            aria-label={isHe ? "סגור" : "Close"}
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="mb-2 text-3xl font-bold text-(--reader-text)" style={{ fontFamily: fontFamilyTitle }}>
            {isLogin 
              ? (isHe ? "התחברות" : "Welcome Back") 
              : (isHe ? "הרשמה" : "Create Account")}
          </h2>
          
          <p className="mb-8 text-sm text-(--reader-text-muted)">
            {isLogin 
              ? (isHe ? "התחבר כדי לגשת לסיפורי הפרימיום שלך" : "Sign in to access your Premium stories") 
              : (isHe ? "הצטרף אלינו כדי לקרוא ללא הגבלה" : "Join Sipuraya for unlimited stories")}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left" dir={dir}>
            
            {/* Email Field */}
            <div className="relative">
              <div className={`absolute top-1/2 -translate-y-1/2 ${isHe ? "right-3" : "left-3"} text-(--reader-text-muted)`}>
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isHe ? "דואר אלקטרוני" : "Email Address"}
                required
                className={`w-full rounded-2xl border border-border bg-(--reader-surface) py-3 text-sm text-(--reader-text) outline-none transition-colors focus:border-(--reader-accent) focus:ring-1 focus:ring-(--reader-accent) ${isHe ? "pl-4 pr-10 hover:pr-10" : "pl-10 pr-4"}`}
                style={{ fontFamily: fontFamilyBody }}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className={`absolute top-1/2 -translate-y-1/2 ${isHe ? "right-3" : "left-3"} text-(--reader-text-muted)`}>
                <Lock className="h-5 w-5" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isHe ? "סיסמה" : "Password"}
                required
                className={`w-full rounded-2xl border border-border bg-(--reader-surface) py-3 text-sm text-(--reader-text) outline-none transition-colors focus:border-(--reader-accent) focus:ring-1 focus:ring-(--reader-accent) ${isHe ? "pl-4 pr-10" : "pl-10 pr-4"}`}
                style={{ fontFamily: fontFamilyBody }}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-2xl bg-(--reader-accent) py-6 text-base font-bold text-(--reader-accent-foreground) shadow-md hover:bg-(--reader-accent)/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isLogin ? (isHe ? "היכנס" : "Sign In") : (isHe ? "הירשם" : "Sign Up")
              )}
            </Button>

          </form>

          <div className="mt-8 text-sm text-(--reader-text-muted)">
            {isLogin ? (
              <p>
                {isHe ? "אין לך חשבון? " : "Don't have an account? "}
                <button onClick={() => setIsLogin(false)} className="font-bold text-(--reader-accent) hover:underline cursor-pointer">
                  {isHe ? "הירשם כאן" : "Sign up here"}
                </button>
              </p>
            ) : (
              <p>
                {isHe ? "כבר יש לך חשבון? " : "Already have an account? "}
                <button onClick={() => setIsLogin(true)} className="font-bold text-(--reader-accent) hover:underline cursor-pointer">
                  {isHe ? "התחבר כאן" : "Sign in here"}
                </button>
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
