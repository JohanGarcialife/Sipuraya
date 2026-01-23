import { createBrowserClient } from "@supabase/ssr";

// This function creates a new Supabase client for the browser
// and should be used in client components.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

