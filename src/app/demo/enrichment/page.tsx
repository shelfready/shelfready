import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { enrichmentProposals, products } from "@/db/schema";
import { getOrCreateDemoMerchant } from "@/demo/seed";
import { Badge, Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DemoEnrichment() {
  const db = getDb();
  const merchantId = await getOrCreateDemoMerchant(db);
  const rows = await db
    .select({
      proposal: enrichmentProposals,
      externalId: products.externalId,
      productTitle: products.title,
    })
    .from(enrichmentProposals)
    .innerJoin(products, eq(enrichmentProposals.productId, products.id))
    .where(eq(enrichmentProposals.merchantId, merchantId))
    .orderBy(desc(enrichmentProposals.createdAt));

  return (
    <>
      <PageHeader
        title="Claude enrichment"
        description="Claude drafts fixes for the audit's findings — merchants approve or reject each one. (Buttons disabled in the demo.)"
      />
      <div className="grid gap-4">
        {rows.map(({ proposal, externalId, productTitle }) => (
          <Card key={proposal.id}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{externalId}</span>
                <span className="max-w-56 truncate text-sm text-slate-500">{productTitle}</span>
                <Badge tone="neutral">{proposal.field}</Badge>
                <Badge tone="warning">{proposal.status}</Badge>
              </div>
              <div className="flex gap-2 opacity-50">
                <span className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white">Approve</span>
                <span className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">Reject</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-red-50 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-400">Current</p>
                <p className="whitespace-pre-wrap text-slate-700">
                  {proposal.currentValue ?? <em className="text-slate-400">empty</em>}
                </p>
              </div>
              <div className="rounded-lg bg-brand-50 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">Proposed</p>
                <p className="whitespace-pre-wrap text-slate-700">{proposal.proposedValue}</p>
              </div>
            </div>
            {proposal.rationale && (
              <p className="mt-2 text-xs text-slate-500">{proposal.rationale}</p>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
