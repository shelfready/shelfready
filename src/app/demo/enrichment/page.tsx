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
                <span className="max-w-56 truncate text-sm text-muted-foreground">{productTitle}</span>
                <Badge tone="neutral">{proposal.field}</Badge>
                <Badge tone="warning">{proposal.status}</Badge>
              </div>
              <div className="flex gap-2 opacity-50">
                <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Approve</span>
                <span className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground">Reject</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-red-50 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-400">Current</p>
                <p className="whitespace-pre-wrap text-foreground">
                  {proposal.currentValue ?? <em className="text-muted-foreground">empty</em>}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">Proposed</p>
                <p className="whitespace-pre-wrap text-foreground">{proposal.proposedValue}</p>
              </div>
            </div>
            {proposal.rationale && (
              <p className="mt-2 text-xs text-muted-foreground">{proposal.rationale}</p>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
