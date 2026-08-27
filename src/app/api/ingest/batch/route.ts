import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { stories } = await req.json();

    if (!Array.isArray(stories) || stories.length === 0) {
      return NextResponse.json({ error: "Invalid stories payload" }, { status: 400 });
    }

    const { error } = await supabase
      .from('stories')
      .upsert(stories, { onConflict: 'story_id' });

    if (error) {
      console.error("[Ingest Batch API] Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: stories.length });
  } catch (error: any) {
    console.error("[Ingest Batch API] Exception:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
