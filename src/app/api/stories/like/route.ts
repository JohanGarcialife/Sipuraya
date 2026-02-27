import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { story_id } = await req.json();

    if (!story_id) {
      return NextResponse.json({ error: "Story ID is required" }, { status: 400 });
    }

    // Call the RPC defined in our SQL migration to securely increment
    const { error } = await supabase.rpc("increment_story_like", {
      story_id_param: story_id,
    });

    if (error) {
      console.error("Error incrementing like:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Like API exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
