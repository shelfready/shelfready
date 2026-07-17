import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { expandCatalog } from "@/feeds/expand";
import { sellerSettingsOf } from "@/feeds/render";
import { auditCatalog } from "@/audit/rules";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ReAuditButton } from "./actions";

const GRADE_COLOR: Record<string, string> = {
  A: "text-brand-700",
  B: "text-brand-600",
  C: "text-amber-600",
  D: "text-orange-600",
  F: "text-red-600",
};

const SEVERITY_TONE = {
  error: "danger",
  warning: "warning",
  info: "neutral",
} as const;

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
      <>
        <PageHeader title="Agent-readiness audit" />
        <EmptyState
          title="Nothing to audit yet"
          description="Add your catalog first — the audit scores every SKU against what AI shopping surfaces require and tells you exactly what to fix."
          action={
            <Link
              href="/dashboard/sources"
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
            >
              Add your catalog
            </Link>
          }
        />
      </>
    );
  }

  // Live audit view (persisted findings refresh on sync; this page is
  // always current truth — same engine either way).
  const audit = auditCatalog(
    expandCatalog(productRows, variantRows),
    sellerSettingsOf(m),
  );

  // Impact-ordered fix list: rule weight × affected items.
  const byRule = new Map<
    string,
    { message: string; severity: "error" | "warning" | "info"; count: number; impact: number }
  >();
  for (const item of audit.items) {
    for (const f of item.findings) {
      const agg = byRule.get(f.code) ?? {
        message: f.message,
        severity: f.severity,
        count: 0,
        impact: 0,
      };
      agg.count++;
      agg.impact += f.weight;
      byRule.set(f.code, agg);
    }
  }
  const fixList = [...byRule.entries()].sort((a, b) => b[1].impact - a[1].impact);
  const worstItems = [...audit.items].sort((a, b) => a.score - b.score).slice(0, 50);

  return (
    <>
      <PageHeader
        title="Agent-readiness audit"
        description="How ready your catalog is for AI shopping surfaces — and what to fix first."
        action={<ReAuditButton />}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <span className={`text-5xl font-bold ${GRADE_COLOR[audit.grade]}`}>
            {audit.grade}
          </span>
          <div>
            <p className="text-2xl font-semibold">{audit.catalogScore}/100</p>
            <p className="text-sm text-slate-500">catalog score</p>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Items audited</p>
          <p className="mt-1 text-2xl font-semibold">{audit.items.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Open findings</p>
          <p className="mt-1 text-2xl font-semibold">
            {audit.items.reduce((s, i) => s + i.findings.length, 0) +
              audit.catalogFindings.length}
          </p>
        </Card>
      </div>

      {audit.catalogFindings.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <h2 className="mb-2 text-base font-semibold text-red-800">
            Catalog-level blockers
          </h2>
          {audit.catalogFindings.map((f) => (
            <p key={f.code} className="text-sm text-red-700">
              {f.message} —{" "}
              <Link href="/dashboard/settings" className="underline">
                fix in Settings
              </Link>
            </p>
          ))}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Fix first (by impact)</h2>
          {fixList.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing to fix — your catalog is fully agent-ready. 🎉
            </p>
          ) : (
            <ul className="grid gap-2">
              {fixList.map(([code, agg]) => (
                <li key={code} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <Badge tone={SEVERITY_TONE[agg.severity]}>{code}</Badge>
                    <p className="mt-1 text-slate-600">{agg.message}</p>
                  </div>
                  <span className="shrink-0 text-slate-500">{agg.count} items</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-x-auto p-0">
          <h2 className="px-4 pt-4 text-base font-semibold">Lowest-scoring items</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 text-right">Score</th>
                <th className="px-4 py-2">Top issues</th>
              </tr>
            </thead>
            <tbody>
              {worstItems.map(({ entry, findings, score }) => (
                <tr key={entry.itemId} className="border-b border-slate-100 align-top last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{entry.itemId}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{score}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {findings.slice(0, 3).map((f) => f.code).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
