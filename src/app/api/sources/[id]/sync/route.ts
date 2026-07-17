import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireMerchant } from "@/lib/require-merchant";
import { runSync } from "@/connectors/sync";
import "@/connectors/csv";
import "@/connectors/woocommerce";
import "@/connectors/feed";

/**
 * Manual pull-sync trigger. Runs inline for now; scheduled/durable syncs
 * move to the Inngest source/sync.requested event with M5.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { merchant } = await requireMerchant();
  const { id } = await params;
  try {
    const { runId, stats } = await runSync(getDb(), merchant.merchantId, id);
    return NextResponse.json({ runId, stats });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
