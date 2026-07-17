import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { requireMerchant } from "@/lib/require-merchant";
import { applyApproved, reviewProposal } from "@/enrichment/engine";

const bodySchema = z.union([
  z.object({
    action: z.literal("review"),
    proposalId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
  }),
  z.object({ action: z.literal("apply") }),
]);

/** Review (approve/reject) proposals and apply approved ones. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const db = getDb();

  if (parsed.data.action === "review") {
    const ok = await reviewProposal(
      db,
      merchant.merchantId,
      parsed.data.proposalId,
      parsed.data.decision,
    );
    if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  const { applied } = await applyApproved(db, merchant.merchantId);
  return NextResponse.json({ applied });
}
