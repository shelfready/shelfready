import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { expandCatalog } from "@/feeds/expand";
import { sellerSettingsOf } from "@/feeds/render";
import { auditCatalog, type CatalogAudit } from "./rules";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * Runs the audit for a merchant: replaces existing findings with the
 * current truth (findings are a snapshot, not a log) and records an
 * `audit` feed_run carrying the score stats the dashboard reads.
 */
export async function runAudit(
  db: AnyDb,
  merchantId: string,
): Promise<{ runId: string; audit: CatalogAudit }> {
  const scope = forMerchant(db, merchantId);
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId));
  if (!m) throw new Error("merchant not found");

  const [run] = await scope.feedRuns.insert([{ kind: "audit", status: "running" }]);

  try {
    const [productRows, variantRows] = await Promise.all([
      scope.products.list(),
      scope.variants.list(),
    ]);
    const productIdByExternal = new Map(productRows.map((p) => [p.externalId, p.id]));
    const audit = auditCatalog(
      expandCatalog(productRows, variantRows),
      sellerSettingsOf(m),
    );

    // Snapshot semantics: clear previous findings, write current ones.
    const rows = [
      ...audit.items.flatMap(({ entry, findings }) =>
        findings.map((f) => ({
          productId:
            productIdByExternal.get(entry.itemId) ??
            productIdByExternal.get(entry.groupId) ??
            null,
          code: f.code,
          severity: f.severity,
          field: f.field,
          message: f.message,
          data: { itemId: entry.itemId, weight: f.weight },
        })),
      ),
      ...audit.catalogFindings.map((f) => ({
        productId: null,
        code: f.code,
        severity: f.severity,
        field: f.field,
        message: f.message,
        data: { weight: f.weight },
      })),
    ];
    await scope.auditFindings.replaceAll(rows);

    const stats = {
      catalogScore: audit.catalogScore,
      grade: audit.grade,
      items: audit.items.length,
      findings: rows.length,
    };
    await scope.feedRuns.update(run.id, {
      status: "succeeded",
      stats,
      finishedAt: new Date(),
    });
    return { runId: run.id, audit };
  } catch (error) {
    await scope.feedRuns.update(run.id, {
      status: "failed",
      error: (error as Error).message,
      finishedAt: new Date(),
    });
    throw error;
  }
}

/** Post-sync hook — audit failures never fail the sync. */
export async function runAuditSafely(db: AnyDb, merchantId: string) {
  try {
    return await runAudit(db, merchantId);
  } catch {
    return null;
  }
}
