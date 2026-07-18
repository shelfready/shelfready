import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Info, PartyPopper, Sparkles } from "lucide-react";
import { getDb } from "@/db";
import { enrichmentProposals, products } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { DiffViewer } from "@/components/diff-viewer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplyApprovedButton, ProposalActions, RunEnrichmentButton } from "./actions";

const STATUS_STYLE: Record<string, string> = {
  pending: "border-accent-amber/40 bg-accent-amber/15 text-accent-amber-foreground",
  approved: "border-primary/20 bg-primary/10 text-primary",
  rejected: "border-border bg-muted text-muted-foreground",
  applied: "border-primary/20 bg-primary/10 text-primary",
};

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
  const decided = rows.filter((r) => r.proposal.status !== "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI enrichment</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Claude drafts catalog fixes — nothing publishes without your approval.
          </p>
        </div>
        <div className="flex gap-2">
          {approved.length > 0 && <ApplyApprovedButton count={approved.length} />}
          <RunEnrichmentButton />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <h3 className="text-lg font-semibold">No proposals yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Run enrichment and Claude will draft better descriptions, infer
            missing brands, and fix overlong titles for the products your{" "}
            <Link href="/dashboard/audit" className="underline">
              audit
            </Link>{" "}
            flagged.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{pending.length}</span>{" "}
              proposal{pending.length === 1 ? "" : "s"} awaiting review
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">{approved.length}</span> approved
            </p>
          </div>

          {pending.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PartyPopper className="size-6" />
              </span>
              <h3 className="text-lg font-semibold">Queue cleared</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                You reviewed every proposal.{" "}
                {approved.length > 0
                  ? `${approved.length} approved change${approved.length === 1 ? "" : "s"} will publish to your feeds when you apply them.`
                  : "Run enrichment again after your next sync."}
              </p>
            </Card>
          )}

          {[...pending, ...decided].map(({ proposal, externalId, productTitle }) => (
            <Card key={proposal.id} className="overflow-hidden p-0">
              <div className="flex items-center gap-3 border-b border-border p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{productTitle ?? "Untitled"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{externalId}</p>
                </div>
                <Badge variant="outline" className="gap-1">
                  {proposal.field}
                </Badge>
                <Badge variant="outline" className={STATUS_STYLE[proposal.status]}>
                  {proposal.status}
                </Badge>
              </div>

              <div className="p-4">
                <DiffViewer
                  before={proposal.currentValue ?? "(empty)"}
                  after={proposal.proposedValue}
                  fieldLabel={proposal.field}
                />

                {proposal.rationale && (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/60 p-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {proposal.rationale}
                    </p>
                  </div>
                )}

                {proposal.status === "pending" && (
                  <div className="mt-4">
                    <ProposalActions proposalId={proposal.id} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
