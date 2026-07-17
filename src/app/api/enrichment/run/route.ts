import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireMerchant } from "@/lib/require-merchant";
import { runEnrichment } from "@/enrichment/engine";

/** Manual enrichment trigger (durable/batch path: Inngest event). */
export async function POST() {
  const { merchant } = await requireMerchant();
  const { entitlementsOf } = await import("@/billing/entitlements");
  const entitlements = await entitlementsOf(getDb(), merchant.merchantId);
  if (!entitlements.enrichment) {
    return NextResponse.json(
      { error: "Claude enrichment is on the Growth plan and up — upgrade in Billing." },
      { status: 402 },
    );
  }
  try {
    const stats = await runEnrichment(getDb(), merchant.merchantId);
    return NextResponse.json(stats);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
