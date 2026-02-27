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
    // 1. Fetch manually curated "new" stories
    const { data: taggedStories, error: tagError } = await supabase
      .from("stories")
      .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en")
      .eq("is_published", true)
      .contains("tags", ["new"])
      .limit(20);

    if (tagError) throw tagError;

    const curatedCount = taggedStories?.length || 0;
    
    let combinedStories = [...(taggedStories || [])];

    // 2. Format list of already fetched IDs to exclude them from the fallback query
    const excludeIds = combinedStories.map((s) => s.story_id);

    // 3. If we don't have 20 curated ones, fill the rest with latest ingested stories
    if (curatedCount < 20) {
      let query = supabase
        .from("stories")
        .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20 - curatedCount);

      if (excludeIds.length > 0) {
        query = query.not("story_id", "in", `(${excludeIds.join(",")})`);
      }

      const { data: latestStories, error: latestError } = await query;
      if (latestError) throw latestError;

      combinedStories = [...combinedStories, ...(latestStories || [])];
    }

    return NextResponse.json({ stories: combinedStories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
