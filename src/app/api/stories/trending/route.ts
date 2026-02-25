import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/stories/trending
 * Returns up to 20 recently-ingested published stories, sorted by newest first.
 * "Trending" = recently added (no view tracking yet — placeholder until analytics added).
 */
export async function GET() {
  try {
    const { data: stories, error } = await supabase
      .from("stories")
      .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
