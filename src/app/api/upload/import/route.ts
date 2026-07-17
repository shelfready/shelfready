import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { parseUpload, rowToCanonical, CANONICAL_COLUMNS, type CsvMapping } from "@/connectors/csv";
import { runSyncItems } from "@/connectors/sync";
import { PLANS, type Entitlements } from "@/billing/plans";
import "@/connectors/csv"; // ensure csv connector registration

const mappingSchema = z.object({
  // partialRecord: a mapping legitimately covers only some canonical fields
  columns: z.partialRecord(z.enum(CANONICAL_COLUMNS), z.string()),
  defaultCurrency: z.string().length(3),
});

/** Step 2 of upload: apply the mapping and run the import pipeline. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);

  const form = await req.formData();
  const file = form.get("file");
  const mappingRaw = form.get("mapping");
  const sourceId = form.get("sourceId");
  if (!(file instanceof File) || typeof mappingRaw !== "string") {
    return NextResponse.json(
      { error: "file and mapping are required" },
      { status: 400 },
    );
  }
  const parsedMapping = mappingSchema.safeParse(JSON.parse(mappingRaw));
  if (!parsedMapping.success) {
    return NextResponse.json({ error: "invalid mapping" }, { status: 400 });
  }
  const mapping: CsvMapping = parsedMapping.data;
  if (!mapping.columns.externalId) {
    return NextResponse.json(
      { error: "an externalId (SKU/ID) column mapping is required" },
      { status: 400 },
    );
  }

  const { rows } = await parseUpload(
    file.name,
    Buffer.from(await file.arrayBuffer()),
  );

  // Entitlement gate (ADR-0007): SKU cap by plan.
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const maxSkus =
    (m.entitlements as Partial<Entitlements>).maxSkus ?? PLANS.free.maxSkus;
  if (rows.length > maxSkus) {
    return NextResponse.json(
      {
        error: `catalog has ${rows.length} rows but the ${m.plan} plan allows ${maxSkus} SKUs — upgrade to import more`,
      },
      { status: 402 },
    );
  }

  // Reuse or create the csv source; the mapping persists for re-uploads.
  let source =
    typeof sourceId === "string" && sourceId
      ? await scope.sources.getById(sourceId)
      : null;
  if (source && source.type !== "csv") {
    return NextResponse.json({ error: "not a csv source" }, { status: 400 });
  }
  if (source) {
    await scope.sources.update(source.id, { config: { mapping } });
  } else {
    [source] = await scope.sources.insert([
      { type: "csv", name: file.name, config: { mapping } },
    ]);
  }

  const { runId, stats } = await runSyncItems(
    db,
    merchant.merchantId,
    source.id,
    rows.map((row) => rowToCanonical(row, mapping)),
  );

  return NextResponse.json({ sourceId: source.id, runId, stats });
}
