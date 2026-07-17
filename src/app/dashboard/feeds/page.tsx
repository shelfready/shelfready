import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedRuns, merchants } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { FEED_FILES, getOrCreateFeedToken, sellerSettingsOf } from "@/feeds/render";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { CopyButton, RenderNowButton } from "./actions";

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
      <>
        <PageHeader title="Feeds" description="Hosted, always-fresh feeds for AI shopping surfaces." />
        <EmptyState
          title="Set your seller details first"
          description="AI surfaces require seller name, URL, and store country on every item. Add them once in Settings — feeds render automatically afterwards."
          action={
            <Link href="/dashboard/settings" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
              Open Settings
            </Link>
          }
        />
      </>
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

  const surfaces: Record<string, string> = {
    "acp.csv": "OpenAI ACP (CSV)",
    "acp.json": "OpenAI ACP (JSON)",
    "gmc.tsv": "Google Merchant Center (TSV)",
    "jsonld.json": "schema.org JSON-LD (per product)",
  };

  return (
    <>
      <PageHeader
        title="Feeds"
        description="Hosted, always-fresh feeds for AI shopping surfaces — regenerated on every sync."
        action={<RenderNowButton />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {lastRender ? (
          <>
            <Badge tone="success">
              {stats?.eligible ?? 0}/{stats?.items ?? 0} items search-eligible
            </Badge>
            <span>
              Last rendered{" "}
              {lastRender.finishedAt
                ? new Date(lastRender.finishedAt).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
                : "—"}
            </span>
          </>
        ) : (
          <Badge tone="warning">Not rendered yet — press Render now</Badge>
        )}
      </div>

      <div className="grid gap-4">
        {FEED_FILES.map(({ file }) => {
          const url = `/f/${merchant.slug}/${token}/${file}`;
          return (
            <Card key={file} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{surfaces[file]}</p>
                <p className="truncate font-mono text-xs text-slate-500">{url}</p>
              </div>
              <CopyButton value={url} />
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Feed URLs contain your private token — treat them like credentials.
        Rotate the token in Settings if a URL leaks. Eligibility follows the
        ACP spec: items missing required fields ship as ineligible until fixed.
      </p>
    </>
  );
}
