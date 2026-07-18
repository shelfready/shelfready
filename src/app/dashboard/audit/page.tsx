import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { expandCatalog } from "@/feeds/expand";
import { sellerSettingsOf } from "@/feeds/render";
import { auditCatalog } from "@/audit/rules";
import { RULE_CATALOG } from "@/audit/rule-catalog";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { AuditTable, type RuleRow } from "./audit-table";
import { ExportCsvButton, ReAuditButton } from "./actions";

export default async function AuditPage() {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const [productRows, variantRows] = await Promise.all([
    scope.products.list(),
    scope.variants.list(),
  ]);

  if (productRows.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold tracking-tight">Readiness audit</h1>
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <h2 className="text-lg font-semibold">Nothing to audit yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add your catalog first — the audit scores every SKU against what AI
            shopping surfaces require and tells you exactly what to fix.
          </p>
          <LinkButton href="/dashboard/sources">Add your catalog</LinkButton>
        </Card>
      </div>
    );
  }

  // Live audit view (persisted findings refresh on sync; this page is
  // always current truth — same engine either way).
  const audit = auditCatalog(
    expandCatalog(productRows, variantRows),
    sellerSettingsOf(m),
  );

  // Per-rule aggregation for the v0 table: affected counts + sample SKUs.
  const titleByItemId = new Map(
    audit.items.map(({ entry }) => [entry.itemId, entry.title]),
  );
  const affectedByCode = new Map<string, string[]>();
  for (const item of audit.items) {
    for (const f of item.findings) {
      const list = affectedByCode.get(f.code) ?? [];
      list.push(item.entry.itemId);
      affectedByCode.set(f.code, list);
    }
  }
  const rules: RuleRow[] = RULE_CATALOG.map((meta) => {
    const affected = affectedByCode.get(meta.code) ?? [];
    return {
      ...meta,
      affected: affected.length,
      total: audit.items.length,
      samples: affected.slice(0, 5).map((sku) => ({
        sku,
        title: titleByItemId.get(sku) ?? null,
      })),
    };
  }).sort((a, b) => b.affected * b.weight - a.affected * a.weight);

  const failing = rules.filter((r) => r.affected > 0).length;
  const critical = rules.filter((r) => r.affected > 0 && r.severity === "error").length;
  const enrichmentAvailable = Boolean(process.env.ANTHROPIC_API_KEY);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Readiness audit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {audit.items.length.toLocaleString()} items audited live against{" "}
            {RULE_CATALOG.length} weighted rules.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton />
          <ReAuditButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Score</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {audit.catalogScore}
            <span className="ml-1 text-base font-medium text-muted-foreground">/ 100</span>
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Grade</p>
          <p className="mt-1 text-2xl font-semibold">{audit.grade}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Rules failing</p>
          <p className="mt-1 text-2xl font-semibold text-destructive">{failing}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Critical</p>
          <p className="mt-1 text-2xl font-semibold text-accent-amber-foreground">{critical}</p>
        </Card>
      </div>

      {audit.catalogFindings.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <h2 className="mb-2 text-base font-semibold text-destructive">
            Catalog-level blockers
          </h2>
          {audit.catalogFindings.map((f) => (
            <p key={f.code} className="text-sm text-destructive">
              {f.message} —{" "}
              <Link href="/dashboard/settings" className="underline">
                fix in Settings
              </Link>
            </p>
          ))}
        </Card>
      )}

      <AuditTable rules={rules} enrichmentAvailable={enrichmentAvailable} />
    </div>
  );
}
