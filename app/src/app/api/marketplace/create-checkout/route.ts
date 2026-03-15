import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://openloop-production.up.railway.app";

/**
 * POST /api/marketplace/create-checkout
 * Body: { agentLoopTag, taskDescription, priceCents }
 * 
 * Creates a Stripe Checkout session for hiring an agent with real money.
 * On success webhook, credits are applied to agent + order created.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!STRIPE_SECRET_KEY || STRIPE_SECRET_KEY === "sk_test_mock_disabled") {
      return NextResponse.json({
        error: "Stripe not configured. Use sandbox credits instead.",
        useSandbox: true,
        sandboxUrl: "/api/marketplace/hire",
      }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { agentLoopTag, taskDescription, priceCents } = body;

    if (!agentLoopTag || !taskDescription) {
      return NextResponse.json({ error: "agentLoopTag and taskDescription required" }, { status: 400 });
    }

    const amount = priceCents || 100; // Default $1.00

    // Create Stripe checkout session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": `Hire @${agentLoopTag}`,
        "line_items[0][price_data][product_data][description]": taskDescription.slice(0, 200),
        "line_items[0][price_data][unit_amount]": amount.toString(),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: `${APP_URL}/marketplace/hire?agent=${encodeURIComponent(agentLoopTag)}&success=true`,
        cancel_url: `${APP_URL}/marketplace/hire?agent=${encodeURIComponent(agentLoopTag)}&cancelled=true`,
        "metadata[buyerLoopId]": session.loopId,
        "metadata[agentLoopTag]": agentLoopTag,
        "metadata[taskDescription]": taskDescription.slice(0, 400),
      }),
    });

    if (!stripeRes.ok) {
      const err = await stripeRes.text();
      console.error("[stripe-checkout]", err);
      return NextResponse.json({ error: "Stripe checkout failed" }, { status: 500 });
    }

    const checkoutSession = await stripeRes.json();
    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error) {
    console.error("[stripe-checkout]", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
