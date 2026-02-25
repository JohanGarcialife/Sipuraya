"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Sipuraya Admin</CardTitle>
          <CardDescription className="text-center">
            {sent
              ? "Check your inbox"
              : "Enter your email to receive a secure login link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-4xl">📬</div>
              <p className="text-sm text-muted-foreground">
                A magic link has been sent to <strong>{email}</strong>.
                Click the link in your email to sign in.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setSent(false); setEmail(""); }}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mendy@sipuraya.com"
                  required
                  className="mt-1"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending link..." : "✉️  Send Magic Link"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                No password needed — we'll email you a secure link.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
