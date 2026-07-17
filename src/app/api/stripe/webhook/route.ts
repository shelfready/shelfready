import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb } from "@/db";
import { processStripeEvent } from "@/billing/stripe-events";

/**
 * Stripe webhook receiver. Signature is verified against
 * STRIPE_WEBHOOK_SECRET before anything is parsed as trusted; event
 * application is idempotent (see processStripeEvent).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await Stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const result = await processStripeEvent(getDb(), event);
  return NextResponse.json({ received: true, ...result });
}
