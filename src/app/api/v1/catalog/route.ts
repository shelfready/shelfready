import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { runSyncItems } from "@/connectors/sync";
import { apiError, requireApiKey } from "@/lib/api-auth";
import "@/connectors/api";

const bodySchema = z.object({
  items: z.array(z.unknown()).min(1).max(5000),
});

/**
 * POST /api/v1/catalog — push canonical-shaped items straight through the
 * sync pipeline (validation → upsert), the CSV pipeline as an endpoint.
 * Items land on an auto-provisioned "API push" source.
 */
export async function POST(req: Request) {
  const auth = await requireApiKey(req, "write");
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, "body must be {items: [...]} with 1–5000 items");
  }

  const scope = forMerchant(getDb(), auth.merchantId);
  const sources = await scope.sources.list();
  const source =
    sources.find((s) => s.type === "api") ??
    (await scope.sources.insert([{ type: "api", name: "API push" }]))[0];

  const { runId, stats } = await runSyncItems(
    getDb(),
    auth.merchantId,
    source.id,
    parsed.data.items,
  );
  return NextResponse.json({ data: { run_id: runId, source_id: source.id, stats } });
}
