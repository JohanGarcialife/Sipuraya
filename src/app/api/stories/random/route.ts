import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Pick a random story using Postgres random()
    const { data, error } = await supabase
      .rpc("get_random_story");

    if (error || !data || data.length === 0) {
      // Fallback: fetch a page and pick random index
      const { data: stories, error: fbErr } = await supabase
        .from("stories")
        .select("story_id")
        .eq("is_published", true)
        .limit(100);

      if (fbErr || !stories?.length) {
        return NextResponse.json({ error: "No stories found" }, { status: 404 });
      }

      const random = stories[Math.floor(Math.random() * stories.length)];
      return NextResponse.json({ story_id: random.story_id });
    }

    return NextResponse.json({ story_id: data[0].story_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
