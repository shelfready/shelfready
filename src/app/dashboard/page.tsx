import { and, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowRight,
  Package,
  Rss,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getDb } from "@/db";
import { enrichmentProposals, merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { sellerSettingsOf } from "@/feeds/render";
import { timeAgo } from "@/lib/time";
import { StatCard } from "@/components/dashboard/stat-card";
import { ScoreGauge } from "@/components/score-gauge";
import { Sparkline } from "@/components/sparkline";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/link-button";
import { OnboardingChecklist } from "./onboarding";
import { Greeting } from "./greeting";

const kindStyles: Record<string, string> = {
  render: "bg-primary/10 text-primary",
  drift: "bg-accent-amber/20 text-accent-amber-foreground",
  audit: "bg-brand/10 text-brand",
  sync: "bg-muted text-muted-foreground",
};

const kindLabels: Record<string, string> = {
  render: "Feeds rendered",
  drift: "Drift check",
  audit: "Audit run",
  sync: "Catalog sync",
};

function runSummary(run: {
  kind: string;
  status: string;
  stats: unknown;
  error: string | null;
}): string {
  const label = kindLabels[run.kind] ?? run.kind;
  if (run.status === "failed") {
    return `${label} failed${run.error ? ` — ${run.error.slice(0, 60)}` : ""}`;
  }
  if (run.status === "running") return `${label} in progress`;
  const s = (run.stats ?? {}) as Record<string, number>;
  if (run.kind === "audit" && s.catalogScore != null) {
    return `${label} — score ${s.catalogScore}, ${s.findings ?? 0} findings`;
  }
  if (run.kind === "render" && s.items != null) {
    return `${label} — ${s.eligible ?? 0}/${s.items} items eligible`;
  }
  if (run.kind === "sync" && s.items != null) {
    return `${label} — ${s.items} items`;
  }
  if (run.kind === "drift" && s.checked != null) {
    return `${label} — ${s.drifted ?? 0} of ${s.checked} pages drifted`;
  }
  return `${label} succeeded`;
}

export default async function DashboardPage() {
  const { session, merchant } = await requireMerchant();
  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [products, variants, sources, runs, findings, [merchantRow], pendingProposals] =
    await Promise.all([
      scope.products.list(),
      scope.variants.list(),
      scope.sources.list(),
      scope.feedRuns.list(),
      scope.auditFindings.list(),
      db.select().from(merchants).where(eq(merchants.id, merchant.merchantId)),
      db
        .select({ id: enrichmentProposals.id })
        .from(enrichmentProposals)
        .where(
          and(
            eq(enrichmentProposals.merchantId, merchant.merchantId),
            eq(enrichmentProposals.status, "pending"),
          ),
        ),
    ]);

  const seller = sellerSettingsOf(merchantRow);
  const hasSellerSettings = Boolean(
    seller.sellerName && seller.sellerUrl && seller.storeCountry,
  );
  const onboarding = {
    hasSource: sources.length > 0,
    hasSellerSettings,
    // A render without seller settings produces all-ineligible feeds — the
    // step only counts once feeds are actually usable.
    feedsRendered:
      hasSellerSettings &&
      runs.some((r) => r.kind === "render" && r.status === "succeeded"),
    auditRun: runs.some((r) => r.kind === "audit" && r.status === "succeeded"),
  };

  const sortedRuns = [...runs].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );
  const auditRuns = sortedRuns.filter(
    (r) => r.kind === "audit" && r.status === "succeeded" && r.stats,
  );
  const latestAudit = auditRuns[0];
  const auditStats = (latestAudit?.stats ?? null) as {
    catalogScore?: number;
    grade?: string;
    findings?: number;
  } | null;
  // Oldest → newest for the sparkline.
  const trend = auditRuns
    .slice(0, 20)
    .reverse()
    .map((r) => ((r.stats as { catalogScore?: number }).catalogScore ?? 0));
  const trendDelta =
    trend.length >= 2 ? trend[trend.length - 1] - trend[0] : null;

  const driftFindings = findings.filter((f) => f.code.startsWith("drift_"));
  const auditIssues = findings.filter((f) => !f.code.startsWith("drift_"));
  const criticalCount = auditIssues.filter((f) => f.severity === "error").length;

  const productById = new Map(products.map((p) => [p.id, p]));
  const lastRender = sortedRuns.find(
    (r) => r.kind === "render" && r.status === "succeeded",
  );
  const activity = sortedRuns.slice(0, 6);
  const firstName = (session.user?.name ?? "").split(/\s+/)[0] ?? "";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Greeting name={firstName} />
          <p className="mt-1 text-sm text-muted-foreground">
            {merchant.name}
            {sources.length > 0 &&
              ` · ${sources.length} source${sources.length === 1 ? "" : "s"}`}
            {sortedRuns[0] &&
              ` · last activity ${timeAgo(sortedRuns[0].startedAt)}`}
          </p>
        </div>
        <LinkButton href="/dashboard/audit">
          Open audit
          <ArrowRight />
        </LinkButton>
      </div>

      <OnboardingChecklist state={onboarding} />

      {products.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="size-6" />
          </span>
          <h2 className="text-lg font-semibold">No products yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Upload a CSV/XLSX catalog or connect your store — products land
            here validated and ready for AI-surface feeds.
          </p>
          <LinkButton href="/dashboard/sources">Add your catalog</LinkButton>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Products"
              value={products.length.toLocaleString()}
              icon={<Package className="size-4" />}
              hint={`${variants.length.toLocaleString()} variants`}
              accent="primary"
            />
            <StatCard
              label="Open issues"
              value={auditIssues.length.toLocaleString()}
              icon={<AlertTriangle className="size-4" />}
              hint={`${criticalCount} critical findings`}
              accent="amber"
            />
            <StatCard
              label="Pending enrichments"
              value={pendingProposals.length.toString()}
              icon={<Sparkles className="size-4" />}
              hint="Awaiting your review"
              accent="brand"
            />
            <StatCard
              label="Hosted feeds"
              value={lastRender ? "4" : "—"}
              icon={<Rss className="size-4" />}
              hint={
                lastRender
                  ? `ACP · GMC · JSON-LD · rendered ${timeAgo(lastRender.startedAt)}`
                  : "Not rendered yet"
              }
              accent="primary"
            />
          </div>

          {auditStats?.catalogScore != null && (
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="flex flex-col items-center justify-center gap-4 p-6 lg:col-span-1">
                <h2 className="self-start text-sm font-medium text-muted-foreground">
                  Catalog readiness
                </h2>
                <ScoreGauge
                  score={auditStats.catalogScore}
                  grade={auditStats.grade}
                />
                {trendDelta != null && trendDelta !== 0 && (
                  <div className="flex items-center gap-1.5 text-sm">
                    {trendDelta > 0 ? (
                      <TrendingUp className="size-4 text-primary" />
                    ) : (
                      <TrendingDown className="size-4 text-destructive" />
                    )}
                    <span
                      className={
                        trendDelta > 0
                          ? "font-medium text-primary"
                          : "font-medium text-destructive"
                      }
                    >
                      {trendDelta > 0 ? "+" : ""}
                      {trendDelta} pts
                    </span>
                    <span className="text-muted-foreground">
                      since first audit
                    </span>
                  </div>
                )}
              </Card>

              <Card className="flex flex-col p-6 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Readiness trend
                  </h2>
                  <Badge variant="outline" className="gap-1 text-primary">
                    <TrendingUp className="size-3" />
                    {auditRuns.length} audit{auditRuns.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="mt-4 flex-1">
                  {trend.length >= 2 ? (
                    <Sparkline data={trend} className="h-40 w-full" />
                  ) : (
                    <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      Run more audits to see your score trend over time.
                    </p>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">First audit</p>
                    <p className="text-lg font-semibold">{trend[0] ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-lg font-semibold text-primary">
                      {auditStats.catalogScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Target</p>
                    <p className="text-lg font-semibold">90</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent activity</h2>
              </div>
              {activity.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No activity yet — sync a source to get started.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-4">
                  {activity.map((run) => (
                    <li key={run.id} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase ${kindStyles[run.kind] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {run.kind.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">{runSummary(run)}</p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(run.startedAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Drift alerts</h2>
                {driftFindings.length > 0 && (
                  <Badge className="bg-accent-amber/20 text-accent-amber-foreground">
                    {driftFindings.length}
                  </Badge>
                )}
              </div>
              {driftFindings.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No drift detected — your feed matches your store pages.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col divide-y divide-border">
                  {driftFindings.slice(0, 6).map((f) => {
                    const product = f.productId
                      ? productById.get(f.productId)
                      : undefined;
                    return (
                      <li
                        key={f.id}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          {f.code === "drift_price" ? (
                            <TrendingDown className="size-4" />
                          ) : (
                            <AlertTriangle className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {product?.title ?? product?.externalId ?? "Catalog"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {f.message}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
