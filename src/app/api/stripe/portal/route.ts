import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe. Uses a dummy key if env var is missing during build/dev
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy", {
  apiVersion: "2025-02-24.acacia" as any,
});

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // 1. Get the current origin to build return URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // 2. We need a Stripe Customer ID to create a portal session.
    // If we only have an email, we must look up the customer in Stripe.
    const customers = await stripe.customers.search({
      query: `email:'${email}'`,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: "No active Stripe customer found for this email. Subscriptions are created at checkout." }, 
        { status: 404 }
      );
    }

    const customerId = customers.data[0].id;

    // 3. Create the Billing Portal Session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });

    // 4. Return the Portal URL
    return NextResponse.json({ url: portalSession.url }, { status: 200 });

  } catch (err: any) {
    console.error("Stripe Portal Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
