import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchHebrewDate } from "@/lib/hebcal";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Fisher-Yates shuffle — returns a new shuffled array.
 */
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * GET /api/daily-stories
 *
 * Returns 5 random stories for today's Hebrew date.
 *
 * Query params:
 *   count (optional) - Number of stories to return. Default: 5, Max: 20
 *
 * Response:
 *   {
 *     "stories": [...],
 *     "hebrewDate": { "displayEn": "17 Adar", "displayHe": "י״ז אדר", ... },
 *     "totalForToday": 134,
 *     "afterSunset": false
 *   }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = Math.min(
      Math.max(parseInt(searchParams.get("count") || "5", 10), 1),
      20
    );

    // 1. Get current Hebrew date (with sunset logic)
    const dateResult = await fetchHebrewDate();
    const { displayEn } = dateResult.hebrewDate;

    // 2. Query manually curated 'today' tag first
    const { data: taggedStories } = await supabase
      .from("stories")
      .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en, body_he, body_en, tags")
      .eq("is_published", true)
      .contains("tags", ["today"])
      .limit(count);

    let selected = [...(taggedStories || [])];
    const excludeIds = selected.map((s) => s.story_id);

    // 3. Query all stories matching today's Hebrew date (for total count and filling remainders)
    const { data: dateStories, error } = await supabase
      .from("stories")
      .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en, body_he, body_en, tags")
      .eq("is_published", true)
      .eq("date_en", displayEn);

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: "Failed to query stories" },
        { status: 500 }
      );
    }

    // 4. Fill remaining slots if curated ones didn't hit 'count'
    if (selected.length < count) {
      const remainingPool = (dateStories || []).filter(
        (s) => !excludeIds.includes(s.story_id)
      );
      const shuffled = shuffle(remainingPool);
      selected = [...selected, ...shuffled.slice(0, count - selected.length)];
    }

    return NextResponse.json({
      stories: selected,
      hebrewDate: dateResult.hebrewDate,
      totalForToday: dateStories?.length || 0,
      afterSunset: dateResult.afterSunset,
    });
  } catch (error) {
    console.error("Daily stories API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily stories" },
      { status: 500 }
    );
  }
}
