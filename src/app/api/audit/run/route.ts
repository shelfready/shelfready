import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireMerchant } from "@/lib/require-merchant";
import { runAudit } from "@/audit/run";

/** Manual re-audit trigger. */
export async function POST() {
  const { merchant } = await requireMerchant();
  try {
    const { runId, audit } = await runAudit(getDb(), merchant.merchantId);
    return NextResponse.json({
      runId,
      catalogScore: audit.catalogScore,
      grade: audit.grade,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
