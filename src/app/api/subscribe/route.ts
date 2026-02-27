import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/subscribe
 * Inserts an email into the newsletter_subscribers table.
 */
export async function POST(request: Request) {
  try {
    const { email, source = "search_gate" } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert([{ email, source }]);

    // If error code is 23505 (unique violation), it means they already subscribed.
    // We can treat that as a success for the gate.
    if (error && error.code !== "23505") {
      console.error("Subscription error:", error);
      return NextResponse.json(
        { error: "Failed to subscribe" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription exception:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
