"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/reader/context/AuthContext";
import { useLanguage } from "@/features/reader/context/LanguageContext";
import { Loader2, User, CreditCard, Mail, Lock, ArrowRight, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReaderNav from "@/features/reader/components/ReaderNav";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isHe } = useLanguage();
  const supabase = createSupabaseBrowserClient();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/read");
    } else if (user) {
      setEmail(user.email || "");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-(--reader-bg)">
        <Loader2 className="h-8 w-8 animate-spin text-(--reader-accent)" />
      </div>
    );
  }

  const dir = isHe ? "rtl" : "ltr";
  const fontFamilyBody = isHe ? "var(--font-hebrew-body)" : "var(--font-serif-en)";
  const fontFamilyTitle = isHe ? "var(--font-hebrew)" : "var(--font-serif-en)";

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/read");
      toast.success(isHe ? "התנתקת בהצלחה!" : "Signed out successfully!");
    } catch (err: any) {
       toast.error(isHe ? "שגיאה בהתנתקות" : "Error signing out");
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingUpdate(true);
    
    try {
      const updates: any = {};
      if (email !== user.email) updates.email = email;
      if (password.trim() !== "") updates.password = password;

      if (Object.keys(updates).length === 0) {
        toast.info(isHe ? "אין שינויים לשמירה" : "No changes to save.");
        setLoadingUpdate(false);
        return;
      }

      const { error } = await supabase.auth.updateUser(updates);
      
      if (error) throw error;
      
      toast.success(isHe ? "חשבונך עודכן בהצלחה!" : "Account updated successfully!");
      if (password) setPassword(""); // clear password field after update
      
    } catch (err: any) {
      toast.error(isHe ? "שגיאה בעדכון חשבון: " + err.message : "Error updating account: " + err.message);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      // In a real app, you would pass the customerId stored in your DB, 
      // but if you are using Stripe Checkout directly, sometimes Stripe maps 
      // the email automatically. We will pass the email.
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create portal session");
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || (isHe ? "שגיאה בפתיחת פורטל המנויים" : "Error opening subscription portal"));
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--reader-bg)" dir={dir}>
      <ReaderNav />
      
      <main className="mx-auto max-w-2xl px-6 py-12 md:py-20 animate-in fade-in duration-500">
        
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-(--reader-accent)/10 text-(--reader-accent)">
            <User className="h-10 w-10" />
          </div>
          <h1 
            className="text-4xl font-bold text-(--reader-text)"
            style={{ fontFamily: fontFamilyTitle }}
          >
            {isHe ? "הפרופיל שלי" : "My Profile"}
          </h1>
          <p className="mt-2 text-(--reader-text-muted)" style={{ fontFamily: fontFamilyBody }}>
            {isHe ? "נהל את הגדרות החשבון והמנוי שלך" : "Manage your account settings and subscription"}
          </p>
        </div>

        <div className="space-y-8" style={{ fontFamily: fontFamilyBody }}>
          
          {/* Account Details Section */}
          <div className="rounded-3xl bg-(--reader-surface) p-6 shadow-sm border border-border">
            <h2 className="mb-6 text-xl font-bold text-(--reader-text) flex items-center gap-2">
              <User className="h-5 w-5 text-(--reader-accent)" />
              {isHe ? "פרטי חשבון" : "Account Details"}
            </h2>

            <form onSubmit={handleUpdateAccount} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--reader-text-muted)">
                   {isHe ? "כתובת אימייל" : "Email Address"}
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isHe ? "right-3" : "left-3"} text-(--reader-text-muted)`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`w-full rounded-xl border border-border bg-(--reader-bg) py-3 text-sm text-(--reader-text) outline-none transition-colors focus:border-(--reader-accent) focus:ring-1 focus:ring-(--reader-accent) ${isHe ? "pl-4 pr-10" : "pl-10 pr-4"}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-(--reader-text-muted)">
                   {isHe ? "סיסמה חדשה (אופציונלי)" : "New Password (Optional)"}
                </label>
                <div className="relative">
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isHe ? "right-3" : "left-3"} text-(--reader-text-muted)`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full rounded-xl border border-border bg-(--reader-bg) py-3 text-sm text-(--reader-text) outline-none transition-colors focus:border-(--reader-accent) focus:ring-1 focus:ring-(--reader-accent) ${isHe ? "pl-4 pr-10" : "pl-10 pr-4"}`}
                  />
                </div>
              </div>

              <div className={`flex ${isHe ? "justify-end" : "justify-start"} pt-2`}>
                <Button
                  type="submit"
                  disabled={loadingUpdate}
                  className="rounded-full bg-(--reader-accent) px-6 py-5 font-bold text-(--reader-accent-foreground) shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  {loadingUpdate ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {isHe ? "שמור שינויים" : "Save Changes"}
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Subscription Section */}
          <div className="rounded-3xl bg-(--reader-surface) p-6 shadow-sm border border-border">
            <h2 className="mb-4 text-xl font-bold text-(--reader-text) flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-(--reader-accent)" />
              {isHe ? "ניהול מנוי" : "Subscription Management"}
            </h2>
            
            <p className="mb-6 text-(--reader-text-muted)">
              {isHe 
                ? "צפה בחשבוניות שלך, עדכן את אמצעי התשלום או בטל את המנוי שלך בכל עת דרך הפורטל המאובטח של Stripe." 
                : "View your invoices, update payment methods, or cancel your subscription anytime via the secure Stripe portal."}
            </p>

            <Button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              variant="outline"
              className="w-full rounded-xl border-2 border-(--reader-accent)/20 py-6 text-base font-bold text-(--reader-accent) transition-all hover:bg-(--reader-accent)/5 hover:border-(--reader-accent) group"
            >
              {loadingPortal ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isHe ? "כניסה לפורטל התשלומים" : "Open Billing Portal"}
                  <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1 ${isHe ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
                </span>
              )}
            </Button>
          </div>

          {/* Sign Out Section */}
          <div className="pt-4 pb-12 flex justify-center">
             <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-base font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
                style={{ fontFamily: fontFamilyBody }}
             >
                <LogOut className={`h-5 w-5 ${isHe ? "ml-1 rotate-180" : "mr-1"}`} />
                {isHe ? "התנתק מהמערכת" : "Sign Out"}
             </button>
          </div>

        </div>
      </main>
    </div>
  );
}
