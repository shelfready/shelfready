import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { enrichmentProposals, products } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ApplyApprovedButton, ProposalActions, RunEnrichmentButton } from "./actions";

const STATUS_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "neutral",
  applied: "success",
} as const;

export default async function EnrichmentPage() {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const rows = await db
    .select({
      proposal: enrichmentProposals,
      externalId: products.externalId,
      productTitle: products.title,
    })
    .from(enrichmentProposals)
    .innerJoin(products, eq(enrichmentProposals.productId, products.id))
    .where(eq(enrichmentProposals.merchantId, merchant.merchantId))
    .orderBy(desc(enrichmentProposals.createdAt))
    .limit(200);

  const pending = rows.filter((r) => r.proposal.status === "pending");
  const approved = rows.filter((r) => r.proposal.status === "approved");

  return (
    <>
      <PageHeader
        title="Claude enrichment"
        description="Claude proposes catalog fixes — nothing is applied without your approval."
        action={
          <div className="flex gap-2">
            <RunEnrichmentButton />
            {approved.length > 0 && <ApplyApprovedButton count={approved.length} />}
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No proposals yet"
          description="Run enrichment and Claude will draft better descriptions, infer missing brands, and fix overlong titles for the products your audit flagged."
          action={<RunEnrichmentButton />}
        />
      ) : (
        <div className="grid gap-4">
          {pending.length === 0 && (
            <p className="text-sm text-slate-500">
              No pending proposals — run enrichment again after your next sync,
              or check the <Link className="underline" href="/dashboard/audit">audit</Link>{" "}
              for remaining issues.
            </p>
          )}
          {rows.map(({ proposal, externalId, productTitle }) => (
            <Card key={proposal.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{externalId}</span>
                  <span className="max-w-56 truncate text-sm text-slate-500">
                    {productTitle}
                  </span>
                  <Badge tone="neutral">{proposal.field}</Badge>
                  <Badge tone={STATUS_TONE[proposal.status]}>{proposal.status}</Badge>
                </div>
                {proposal.status === "pending" && (
                  <ProposalActions proposalId={proposal.id} />
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-red-50 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-red-400">
                    Current
                  </p>
                  <p className="whitespace-pre-wrap text-slate-700">
                    {proposal.currentValue ?? <em className="text-slate-400">empty</em>}
                  </p>
                </div>
                <div className="rounded-lg bg-brand-50 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">
                    Proposed
                  </p>
                  <p className="whitespace-pre-wrap text-slate-700">
                    {proposal.proposedValue}
                  </p>
                </div>
              </div>
              {proposal.rationale && (
                <p className="mt-2 text-xs text-slate-500">{proposal.rationale}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
