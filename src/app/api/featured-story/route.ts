import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchHebrewDate } from "@/lib/hebcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/featured-story
 *
 * Returns the "Story of the Day" for today's Hebrew date.
 *
 * Resolution order:
 *  1. Any story tagged `featured-{day}-{month}` (e.g. "featured-7-Sivan")
 *     → Mendy schedules these in advance via the admin panel.
 *  2. FALLBACK A — a random story whose date_en matches today's Hebrew date.
 *  3. FALLBACK B — a completely random published story (last resort).
 *
 * Response:
 *  { story: Story | null, hebrewDate: HebrewDateInfo, source: "scheduled"|"date-match"|"random" }
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get today's Hebrew date
    let dateResult;
    try {
      dateResult = await fetchHebrewDate();
    } catch {
      // Minimal fallback if HebCal is down
      dateResult = {
        hebrewDate: {
          day: 1, month: "Adar", monthHe: "אדר", dayHe: "א׳",
          year: 5785, displayEn: "1 Adar", displayHe: "א׳ אדר", fullHe: "א׳ אדר תשפ״ה",
        },
        afterSunset: false, sunset: null as string | null, events: [] as string[],
      };
    }

    const { day, month, displayEn } = dateResult.hebrewDate;
    // Tag format: "featured-7-Sivan"
    const featuredTag = `featured-${day}-${month}`;

    const SELECT_FIELDS =
      "story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en, body_he, body_en, tags, image_url";

    // 2. Try scheduled tag first
    const { data: scheduled } = await supabase
      .from("stories")
      .select(SELECT_FIELDS)
      .eq("is_published", true)
      .contains("tags", [featuredTag])
      .limit(1)
      .maybeSingle();

    if (scheduled) {
      return NextResponse.json({
        story: scheduled,
        hebrewDate: dateResult.hebrewDate,
        source: "scheduled",
      });
    }

    // 3. Fallback A — random story matching today's Hebrew date
    const { data: dateMatches } = await supabase
      .from("stories")
      .select(SELECT_FIELDS)
      .eq("is_published", true)
      .eq("date_en", displayEn);

    if (dateMatches && dateMatches.length > 0) {
      const randomIndex = Math.floor(Math.random() * dateMatches.length);
      return NextResponse.json({
        story: dateMatches[randomIndex],
        hebrewDate: dateResult.hebrewDate,
        source: "date-match",
      });
    }

    // 4. Fallback B — completely random story
    const { data: randomStory } = await supabase
      .from("stories")
      .select(SELECT_FIELDS)
      .eq("is_published", true)
      .limit(1)
      .order("created_at", { ascending: false })
      .maybeSingle();

    return NextResponse.json({
      story: randomStory || null,
      hebrewDate: dateResult.hebrewDate,
      source: "random",
    });
  } catch (error) {
    console.error("Featured story API error:", error);
    return NextResponse.json({ error: "Failed to fetch featured story" }, { status: 500 });
  }
}
