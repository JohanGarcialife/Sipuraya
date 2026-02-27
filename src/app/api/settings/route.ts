import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = 'nodejs';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sys_settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return NextResponse.json({ value: null });
      }
      throw error;
    }

    return NextResponse.json({ value: data.value });
  } catch (error: any) {
    console.error("Settings API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
