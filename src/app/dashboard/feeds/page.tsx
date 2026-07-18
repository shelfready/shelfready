import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { getDb } from "@/db";
import { feedRuns, merchants } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { FEED_FILES, getOrCreateFeedToken, sellerSettingsOf } from "@/feeds/render";
import { timeAgo } from "@/lib/time";
import { CopyButton } from "@/components/copy-button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/link-button";
import { RenderNowButton } from "./actions";

function isFresh(finishedAt: Date | null | undefined): boolean {
  return Boolean(finishedAt && Date.now() - finishedAt.getTime() < 24 * 60 * 60 * 1000);
}

const surfaces: Record<string, { name: string; spec: string }> = {
  "acp.csv": { name: "OpenAI ACP", spec: "Agentic Commerce Protocol · CSV" },
  "acp.json": { name: "OpenAI ACP", spec: "Agentic Commerce Protocol · JSON" },
  "gmc.tsv": { name: "Google Merchant Center", spec: "GMC product feed · TSV" },
  "jsonld.json": { name: "schema.org JSON-LD", spec: "Product structured data · JSON" },
};

export default async function FeedsPage() {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const seller = sellerSettingsOf(m);
  const configured = seller.sellerName && seller.sellerUrl && seller.storeCountry;

  if (!configured) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Feeds</h1>
        <Card className="mt-6 flex flex-col items-center gap-3 p-12 text-center">
          <h2 className="text-lg font-semibold">Set your seller details first</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            AI surfaces require seller name, URL, and store country on every
            item. Add them once in Settings — feeds render automatically
            afterwards.
          </p>
          <LinkButton href="/dashboard/settings">Open Settings</LinkButton>
        </Card>
      </div>
    );
  }

  const token = await getOrCreateFeedToken(db, merchant.merchantId);
  const runs = await db
    .select()
    .from(feedRuns)
    .where(eq(feedRuns.merchantId, merchant.merchantId))
    .orderBy(desc(feedRuns.startedAt))
    .limit(50);
  const lastRender = runs.find((r) => r.kind === "render" && r.status === "succeeded");
  const stats = (lastRender?.stats ?? null) as { items?: number; eligible?: number } | null;

  const h = await headers();
  const origin =
    process.env.AUTH_URL ??
    `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? "useshelfready.com"}`;

  const fresh = isFresh(lastRender?.finishedAt);
  const ineligible = (stats?.items ?? 0) - (stats?.eligible ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feeds</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Channel-ready outputs rendered from your catalog — point any agent
            or channel at these URLs. Regenerated on every sync.
          </p>
        </div>
        <RenderNowButton />
      </div>

      <div className="grid gap-4">
        {FEED_FILES.map(({ file }) => {
          const surface = surfaces[file] ?? { name: file, spec: file };
          const url = `${origin}/f/${merchant.slug}/${token}/${file}`;
          return (
            <Card key={file} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">{surface.name}</h2>
                    {lastRender ? (
                      <Badge
                        variant="outline"
                        className={
                          fresh
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-accent-amber/30 bg-accent-amber/20 text-accent-amber-foreground"
                        }
                      >
                        {fresh ? "Fresh" : "Stale"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                        Not rendered
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {surface.spec}
                    {stats?.items != null && ` · ${stats.items.toLocaleString()} items`}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-4" />
                    {lastRender?.finishedAt ? timeAgo(lastRender.finishedAt) : "never rendered"}
                  </span>
                  {stats && (
                    <span
                      className={
                        ineligible === 0
                          ? "flex items-center gap-1.5 font-medium text-primary"
                          : "flex items-center gap-1.5 font-medium text-accent-amber-foreground"
                      }
                    >
                      {ineligible === 0 ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <AlertTriangle className="size-4" />
                      )}
                      {ineligible === 0
                        ? "All items eligible"
                        : `${ineligible} ineligible`}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">
                  Feed URL
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
                <CopyButton value={url} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                <LinkButton size="sm" variant="outline" href={url} external>
                  <ExternalLink />
                  Open feed
                </LinkButton>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Feed URLs contain your private token — treat them like credentials.
        Rotate the token in Settings if a URL leaks. Eligibility follows the
        ACP spec: items missing required fields ship as ineligible until fixed.
      </p>
    </div>
  );
}
