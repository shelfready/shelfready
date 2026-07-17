import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { getStripe } from "@/billing/stripe";

/** Stripe Customer Portal session for the signed-in merchant. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const [row] = await db
    .select({ customerId: merchants.stripeCustomerId })
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));

  if (!row?.customerId) {
    return NextResponse.json({ error: "no billing account yet" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? process.env.AUTH_URL ?? "";
  const session = await getStripe().billingPortal.sessions.create({
    customer: row.customerId,
    return_url: `${origin}/dashboard`,
  });
  return NextResponse.json({ url: session.url });
}
