import Link from "next/link";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { timeAgo } from "@/lib/time";
import { Badge, Card, PageHeader } from "@/components/ui";
import { UploadFlow } from "./upload";
import { ConnectWoo, SyncNowButton } from "./connect-woo";
import { ConnectFeed } from "./connect-feed";
import { ConnectBigCommerce } from "./connect-bigcommerce";
import { ConnectMagento } from "./connect-magento";

export default async function SourcesPage() {
  const { merchant } = await requireMerchant();
  const scope = forMerchant(getDb(), merchant.merchantId);
  const [sources, runs] = await Promise.all([
    scope.sources.list(),
    scope.feedRuns.list(),
  ]);
  // Latest sync run per source — to surface plan-cap truncation (#122).
  const latestSyncBySource = new Map<string, (typeof runs)[number]>();
  for (const r of runs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())) {
    if (r.kind === "sync" && r.sourceId && !latestSyncBySource.has(r.sourceId)) {
      latestSyncBySource.set(r.sourceId, r);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Catalog sources"
        description="Where your products come from — file uploads and store connections."
      />

      {sources.length > 0 && (
        <Card className="mb-8 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Last sync</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.type === "csv" ? "neutral" : "success"}>{s.type}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.lastSyncAt ? timeAgo(s.lastSyncAt) : "never"}
                    {(() => {
                      const st = latestSyncBySource.get(s.id)?.stats as
                        | { capped?: number; maxSkus?: number }
                        | null;
                      return (st?.capped ?? 0) > 0 ? (
                        <span className="mt-0.5 block text-xs text-accent-amber-foreground">
                          {st!.capped} items over your {st!.maxSkus}-SKU plan
                          limit —{" "}
                          <Link href="/dashboard/billing" className="underline">
                            upgrade
                          </Link>
                        </span>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {s.type !== "csv" && <SyncNowButton sourceId={s.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-1 text-base font-semibold">Upload a CSV / XLSX catalog</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Works with any cart. We auto-detect your columns; you confirm the mapping.
          </p>
          <UploadFlow />
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-semibold">Connect WooCommerce</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create a <strong>read-only</strong> REST key under WooCommerce →
            Settings → Advanced → REST API. Credentials are encrypted at rest.
          </p>
          <ConnectWoo />
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-semibold">Import from a feed URL</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Already publish a Google Shopping XML or CSV feed? Point us at it —
            works with any cart, re-synced automatically every 6 hours.
          </p>
          <ConnectFeed />
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-semibold">Connect BigCommerce</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create a store-level API account (Settings → Store-level API
            accounts) with <strong>read-only</strong> Products scope. The token
            is encrypted at rest.
          </p>
          <ConnectBigCommerce />
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-semibold">Connect Magento / Adobe Commerce</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Create an integration (System → Extensions → Integrations) with
            read-only <strong>Catalog</strong> scope and paste the access
            token. Encrypted at rest.
          </p>
          <ConnectMagento />
        </Card>
      </div>
    </div>
  );
}
