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

    const { startId, endId, prefix } = await req.json();

    // --- MODE 1: Delete by month prefix (e.g. prefix="Ni" deletes all Ni* stories) ---
    if (prefix) {
      const prefixRegex = /^[A-Za-z]{2}$/;
      if (!prefixRegex.test(prefix)) {
        return NextResponse.json({ error: "Invalid prefix. Must be exactly 2 letters (e.g. 'Ni')." }, { status: 400 });
      }

      console.log(`[Bulk Delete] Deleting ALL stories with prefix: ${prefix}`);

      const { count, error } = await supabase
        .from('stories')
        .delete({ count: 'exact' })
        .ilike('story_id', `${prefix}%`);

      if (error) {
        console.error("[Bulk Delete] Supabase Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        count,
        message: `Successfully deleted ${count} stories with prefix '${prefix}'`
      });
    }

    // --- MODE 2: Delete by ID range (legacy) ---
    if (!startId || !endId) {
      return NextResponse.json({ error: "Either 'prefix' or both 'startId' and 'endId' are required" }, { status: 400 });
    }

    const idRegex = /^[A-Za-z]{2}\d+$/;
    if (!idRegex.test(startId) || !idRegex.test(endId)) {
      return NextResponse.json({ error: "Invalid ID format. Use format like 'Ni0001'" }, { status: 400 });
    }

    const startPrefix = startId.substring(0, 2).toLowerCase();
    const endPrefix = endId.substring(0, 2).toLowerCase();
    if (startPrefix !== endPrefix) {
      return NextResponse.json({ error: "Start and End IDs must belong to the same series (e.g., both start with 'Ni')" }, { status: 400 });
    }

    console.log(`[Bulk Delete] Deleting range ${startId} to ${endId}`);

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

