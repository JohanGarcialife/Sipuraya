import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe. Uses a dummy key if env var is missing during build/dev
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2025-02-24.acacia" as any,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email } = body;

    // 1. Get the current origin to build return URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // 2. We'll use a dynamic Price ID if provided, or fallback to a dummy/test product
    // Note for user: Replace "price_XXXXX" with your actual Stripe Price ID for the $5 subscription
    const PRICE_ID = process.env.STRIPE_PRICE_ID || "price_dummy"; 

    // 3. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_ID, 
          quantity: 1,
        },
      ],
      // Since the user requested $5/month, it's a subscription
      mode: "subscription",
      ui_mode: "embedded",
      
      // On success, embedded checkout calls return_url
      return_url: `${origin}/read?checkout=return&session_id={CHECKOUT_SESSION_ID}`,
      
      // Link the Stripe subscription to the Supabase User
      ...(email && { customer_email: email }),
      ...(userId && { client_reference_id: userId })
    });

    // 4. Return the client_secret so the frontend can mount the Embedded UI
    if (!session.client_secret) {
      throw new Error("Failed to generate Stripe session client secret.");
    }

    return NextResponse.json({ clientSecret: session.client_secret }, { status: 200 });

  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
