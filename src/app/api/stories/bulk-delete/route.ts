import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { startId, endId } = await req.json();

    if (!startId || !endId) {
      return NextResponse.json({ error: "Start ID and End ID are required" }, { status: 400 });
    }

    // Validate IDs (e.g., Ni0001)
    const idRegex = /^[A-Za-z]{2}\d+$/;
    if (!idRegex.test(startId) || !idRegex.test(endId)) {
        return NextResponse.json({ error: "Invalid ID format. Use format like 'Ni0001'" }, { status: 400 });
    }

    // Extract prefix to ensure same series
    const startPrefix = startId.substring(0, 2).toLowerCase();
    const endPrefix = endId.substring(0, 2).toLowerCase();

    if (startPrefix !== endPrefix) {
        return NextResponse.json({ error: "Start and End IDs must belong to the same series (e.g., both start with 'Ni')" }, { status: 400 });
    }

    console.log(`[Bulk Delete] Deleting range ${startId} to ${endId}`);

    // Supabase GTE/LTE only works alphabetically/lexicographically, which works for this ID format
    // "Ni0001" <= "Ni0050" is true
    const { count, error } = await supabase
      .from('stories')
      .delete({ count: 'exact' })
      .gte('story_id', startId)
      .lte('story_id', endId);

    if (error) {
      console.error("[Bulk Delete] Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      count,
      message: `Successfully deleted ${count} stories from ${startId} to ${endId}` 
    });

  } catch (error: any) {
    console.error("[Bulk Delete] API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
