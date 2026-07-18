import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { runAudit } from "@/audit/run";
import { apiError, requireApiKey, withApiErrors } from "@/lib/api-auth";

/** POST /api/v1/audit/runs — run the agent-readiness audit now. */
async function _POST(req: Request) {
  const auth = await requireApiKey(req, "write");
  if (auth instanceof NextResponse) return auth;

  try {
    const { runId, audit } = await runAudit(getDb(), auth.merchantId);
    return NextResponse.json({
      data: {
        run_id: runId,
        catalog_score: audit.catalogScore,
        grade: audit.grade,
      },
    });
  } catch (e) {
    return apiError(422, (e as Error).message);
  }
}

export const POST = withApiErrors(_POST);
