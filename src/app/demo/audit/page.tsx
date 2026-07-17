import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { getOrCreateDemoMerchant } from "@/demo/seed";
import { expandCatalog } from "@/feeds/expand";
import { sellerSettingsOf } from "@/feeds/render";
import { auditCatalog } from "@/audit/rules";
import { Badge, Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const GRADE_COLOR: Record<string, string> = {
  A: "text-brand-700", B: "text-brand-600", C: "text-amber-600",
  D: "text-orange-600", F: "text-red-600",
};
const SEVERITY_TONE = { error: "danger", warning: "warning", info: "neutral" } as const;

export default async function DemoAudit() {
  const db = getDb();
  const merchantId = await getOrCreateDemoMerchant(db);
  const scope = forMerchant(db, merchantId);
  const [m] = await db.select().from(merchants).where(eq(merchants.id, merchantId));
  const audit = auditCatalog(
    expandCatalog(await scope.products.list(), await scope.variants.list()),
    sellerSettingsOf(m),
  );

  const byRule = new Map<string, { message: string; severity: "error" | "warning" | "info"; count: number; impact: number }>();
  for (const item of audit.items) {
    for (const f of item.findings) {
      const agg = byRule.get(f.code) ?? { message: f.message, severity: f.severity, count: 0, impact: 0 };
      agg.count++;
      agg.impact += f.weight;
      byRule.set(f.code, agg);
    }
  }
  const fixList = [...byRule.entries()].sort((a, b) => b[1].impact - a[1].impact);
  const worst = [...audit.items].sort((a, b) => a.score - b.score).slice(0, 8);

  return (
    <>
      <PageHeader
        title="Agent-readiness audit"
        description="Live scoring of the demo catalog — this is what your own audit looks like."
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4">
          <span className={`text-5xl font-bold ${GRADE_COLOR[audit.grade]}`}>{audit.grade}</span>
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
            {audit.items.reduce((s, i) => s + i.findings.length, 0)}
          </p>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold">Fix first (by impact)</h2>
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
          <p className="mt-4 text-sm text-slate-500">
            Several of these are fixable automatically —{" "}
            <Link href="/demo/enrichment" className="text-brand-700 underline">
              see Claude&apos;s proposed fixes →
            </Link>
          </p>
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
              {worst.map(({ entry, findings, score }) => (
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
