import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // Get unique rabbi names (both Hebrew and English)
    const { data, error } = await supabase
      .from('stories')
      .select('rabbi_he, rabbi_en')
      .not('rabbi_he', 'is', null)
      .not('rabbi_en', 'is', null);

    if (error) throw error;

    // Extract unique values
    const uniqueHebrew = [...new Set(data.map(s => s.rabbi_he).filter(Boolean))].sort();
    const uniqueEnglish = [...new Set(data.map(s => s.rabbi_en).filter(Boolean))].sort();

    return NextResponse.json({
      hebrew: uniqueHebrew,
      english: uniqueEnglish
    });

  } catch (error: any) {
    console.error("[API Rabbis/Unique] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
