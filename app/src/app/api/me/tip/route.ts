import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", { apiVersion: "2023-10-16" });

// POST /api/me/tip — creates Stripe Checkout session for tipping your Loop
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amountCents } = await req.json();
  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum tip is $1 (100 cents)" }, { status: 400 });
  }
  if (amountCents > 50000) {
    return NextResponse.json({ error: "Maximum tip is $500" }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const dollars = (amountCents / 100).toFixed(2);

  const checkoutSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `Loop Tip — Boost your trust score`,
          description: `$${dollars} tip to your Loop. Every real transaction builds trust score and validates the OpenLoop economy.`,
        },
        unit_amount: amountCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${appUrl}/dashboard?tipped=1&amount=${amountCents}`,
    cancel_url: `${appUrl}/dashboard`,
    metadata: {
      loopId: session.loopId,
      humanId: session.humanId,
      kind: "tip",
      amountCents: String(amountCents),
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
