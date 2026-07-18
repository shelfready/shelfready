import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { runSync } from "@/connectors/sync";
import { apiError, requireApiKey, withApiErrors } from "@/lib/api-auth";
import "@/connectors/csv";
import "@/connectors/woocommerce";
import "@/connectors/feed";
import "@/connectors/bigcommerce";
import "@/connectors/magento";
import "@/connectors/api";

/** GET /api/v1/syncs — recent sync runs (newest first). */
async function _GET(req: Request) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;

  const runs = await forMerchant(getDb(), auth.merchantId).feedRuns.list();
  const syncs = runs
    .filter((r) => r.kind === "sync")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .slice(0, 50);
  return NextResponse.json({
    data: syncs.map((r) => ({
      run_id: r.id,
      source_id: r.sourceId,
      status: r.status,
      stats: r.stats,
      started_at: r.startedAt,
      finished_at: r.finishedAt,
    })),
  });
}

const bodySchema = z.object({ source_id: z.string().uuid() });

/** POST /api/v1/syncs — trigger a pull sync for one source. */
async function _POST(req: Request) {
  const auth = await requireApiKey(req, "write");
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, "body must be {source_id: <uuid>}");

  try {
    const { runId, stats } = await runSync(
      getDb(),
      auth.merchantId,
      parsed.data.source_id,
    );
    return NextResponse.json({ data: { run_id: runId, stats } });
  } catch (e) {
    return apiError(422, (e as Error).message);
  }
}

export const GET = withApiErrors(_GET);
export const POST = withApiErrors(_POST);
