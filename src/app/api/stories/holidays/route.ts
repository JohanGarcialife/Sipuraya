import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

// Hebrew month names that map to upcoming/spring holidays
const HOLIDAY_MONTHS = [
  "ניסן",    // Nisan — Pesach
  "תשרי",   // Tishrei — Rosh Hashana, Yom Kippur, Sukkot
  "כסלו",   // Kislev — Chanukah
  "טבת",    // Tevet — Chanukah continuation
  "אדר",    // Adar — Purim
  "אדר א",  // Adar I
  "אדר ב",  // Adar II
  "אב",     // Av — Tisha B'Av
  "שבט",    // Shevat — Tu B'Shevat
];

/**
 * GET /api/stories/holidays
 * Returns up to 20 stories whose Hebrew date falls in a holiday month.
 */
export async function GET() {
  try {
    // Build OR filters for each holiday month
    const filters = HOLIDAY_MONTHS.map((m) => `date_he.ilike.%${m}%`).join(",");

    const { data: stories, error } = await supabase
      .from("stories")
      .select("story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en")
      .eq("is_published", true)
      .or(filters)
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Shuffle so it's never the same order
    const shuffled = (stories || []).sort(() => Math.random() - 0.5);

    return NextResponse.json({ stories: shuffled });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
