import { NextResponse } from "next/server";
import { requireMerchant } from "@/lib/require-merchant";
import { getStripe } from "@/billing/stripe";
import { isPlanId, PLANS } from "@/billing/plans";

/**
 * Creates a Stripe Checkout Session for a paid tier. The price is looked
 * up by metadata set by scripts/stripe-setup.ts; merchant identity rides
 * on client_reference_id + metadata for the webhook.
 */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const { plan } = (await req.json()) as { plan?: string };
  if (!plan || !isPlanId(plan) || PLANS[plan].priceUsdMonthly === 0) {
    return NextResponse.json({ error: "unknown paid plan" }, { status: 400 });
  }

  const stripe = getStripe();
  const prices = await stripe.prices.search({
    query: `active:'true' AND metadata['shelfready_plan']:'${plan}'`,
  });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      { error: "price not provisioned (run scripts/stripe-setup.ts)" },
      { status: 500 },
    );
  }

  const origin = req.headers.get("origin") ?? process.env.AUTH_URL ?? "";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    client_reference_id: merchant.merchantId,
    metadata: { plan },
    subscription_data: { metadata: { plan } },
    success_url: `${origin}/dashboard?billing=success`,
    cancel_url: `${origin}/dashboard?billing=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
