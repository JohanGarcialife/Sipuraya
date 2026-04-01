import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';



// Hebrew month names that map to upcoming/spring holidays
const HOLIDAY_MONTHS = [
  "ניסן",    // Nisan — Pesach
  "אייר",   // Iyar — Lag BaOmer
  "סיון",   // Sivan — Shavuot
  "תמוז",   // Tamuz — 17 Tamuz
  "אב",     // Av — Tisha B'Av
  "אלול",   // Elul — Preparation for High Holidays
  "תשרי",   // Tishrei — Rosh Hashana, Yom Kippur, Sukkot
  "חשון",   // Cheshvan — (No major holidays, but good for coverage)
  "כסלו",   // Kislev — Chanukah
  "טבת",    // Tevet — Chanukah continuation
  "שבט",    // Shevat — Tu B'Shevat
  "אדר",    // Adar — Purim
  "אדר א",  // Adar I
  "אדר ב",  // Adar II
];

/**
 * GET /api/stories/holidays
 * Returns up to 20 stories whose Hebrew date falls in a holiday month.
 */
export async function GET() {
  try {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

    // 1. Fetch manually curated "holiday" stories
    const { data: taggedStories, error: tagError } = await supabase
      .from("stories")
      .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en")
      .eq("is_published", true)
      .contains("tags", ["holiday"])
      .limit(20);

    if (tagError) throw tagError;

    const curatedCount = taggedStories?.length || 0;
    let combinedStories = [...(taggedStories || [])];

    // 2. Format list of already fetched IDs to exclude them from the fallback query
    const excludeIds = combinedStories.map((s) => s.story_id);

    // 3. Automated month fetching if we don't have 20 curated
    if (curatedCount < 20) {
      // Build OR filters for each holiday month
      const filters = HOLIDAY_MONTHS.map((m) => `date_he.ilike.%${m}%`).join(",");

      let query = supabase
        .from("stories")
        .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en")
        .eq("is_published", true)
        .or(filters)
        .limit(20 - curatedCount);

      if (excludeIds.length > 0) {
        query = query.not("story_id", "in", `(${excludeIds.join(",")})`);
      }

      const { data: monthStories, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const shuffled = (monthStories || []).sort(() => Math.random() - 0.5);
      combinedStories = [...combinedStories, ...shuffled];
    }

    return NextResponse.json({ stories: combinedStories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
