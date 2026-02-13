
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesName = searchParams.get("name");

    if (!seriesName) {
      return NextResponse.json({ error: "Series name required" }, { status: 400 });
    }

    const { data: stories, error } = await supabase
      .from("stories")
      .select(
        "story_id, rabbi_he, rabbi_en, date_he, date_en, title_he, title_en, body_he, body_en, tags, series"
      )
      .eq("series", seriesName)
      .limit(20); // Limit to 20 for the ribbon

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ stories: stories || [] });
  } catch (error) {
    console.error("Series API error:", error);
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
  }
}
