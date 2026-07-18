import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireApiKey, withApiErrors } from "@/lib/api-auth";

/** GET /api/v1/audit — latest audit run + current findings snapshot. */
async function _GET(req: Request) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;

  const scope = forMerchant(getDb(), auth.merchantId);
  const [runs, findings] = await Promise.all([
    scope.feedRuns.list(),
    scope.auditFindings.list(),
  ]);
  const lastAudit = runs
    .filter((r) => r.kind === "audit")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  return NextResponse.json({
    data: {
      last_run: lastAudit
        ? {
            run_id: lastAudit.id,
            status: lastAudit.status,
            stats: lastAudit.stats,
            started_at: lastAudit.startedAt,
            finished_at: lastAudit.finishedAt,
          }
        : null,
      findings: findings.map((f) => ({
        product_id: f.productId,
        variant_id: f.variantId,
        code: f.code,
        severity: f.severity,
        field: f.field,
        message: f.message,
      })),
    },
  });
}

export const GET = withApiErrors(_GET);
