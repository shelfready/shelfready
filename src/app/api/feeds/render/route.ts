import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireMerchant } from "@/lib/require-merchant";
import { renderFeeds } from "@/feeds/render";

/** Manual re-render of all feed artifacts. */
export async function POST() {
  const { merchant } = await requireMerchant();
  try {
    const { runId, stats } = await renderFeeds(getDb(), merchant.merchantId);
    return NextResponse.json({ runId, stats });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
