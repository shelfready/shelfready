import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { sellerSettingsOf } from "@/feeds/render";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm, RotateTokenButton } from "./form";
import { ApiKeysPanel, type KeyUsage } from "./api-keys";
import { UsageChart } from "./usage-chart";
import { WebhooksPanel, type WebhookRow } from "./webhooks-panel";

function isoDayAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export default async function SettingsPage() {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [[m], keys, usageRows, hooks, deliveries] = await Promise.all([
    db.select().from(merchants).where(eq(merchants.id, merchant.merchantId)),
    scope.apiKeys.list(),
    scope.apiUsage.window(30),
    scope.webhooks.list(),
    scope.webhookDeliveries.list(),
  ]);
  const seller = sellerSettingsOf(m);

  // Per-key 7d/30d totals + zero-filled 30-day series for the chart.
  const sevenDaysAgo = isoDayAgo(7);
  const usage: KeyUsage = {};
  const totalsByDay = new Map<string, number>();
  let total30d = 0;
  for (const row of usageRows) {
    const k = (usage[row.apiKeyId] ??= { requests7d: 0, requests30d: 0 });
    k.requests30d += row.count;
    if (row.day >= sevenDaysAgo) k.requests7d += row.count;
    totalsByDay.set(row.day, (totalsByDay.get(row.day) ?? 0) + row.count);
    total30d += row.count;
  }
  const days = Array.from({ length: 30 }, (_, i) => {
    const day = isoDayAgo(29 - i);
    return { day, total: totalsByDay.get(day) ?? 0 };
  });

  // Webhooks with their 10 most recent deliveries each.
  const deliveriesByHook = new Map<string, typeof deliveries>();
  for (const d of [...deliveries].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )) {
    const list = deliveriesByHook.get(d.webhookId) ?? [];
    if (list.length < 10) list.push(d);
    deliveriesByHook.set(d.webhookId, list);
  }
  const webhookRows: WebhookRow[] = hooks
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events as string[],
      enabled: w.enabled,
      createdAt: w.createdAt.toISOString(),
      deliveries: (deliveriesByHook.get(w.id) ?? []).map((d) => ({
        id: d.id,
        event: d.event,
        status: d.status,
        attempts: d.attempts,
        lastError: d.lastError,
        nextAttemptAt: d.nextAttemptAt?.toISOString() ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
    }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Settings"
        description="Seller details that every AI surface requires on feed items."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-base font-semibold">Seller details</h2>
          <SettingsForm
            initial={{
              sellerName: seller.sellerName ?? "",
              sellerUrl: seller.sellerUrl ?? "",
              storeCountry: seller.storeCountry ?? "",
            }}
          />
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-semibold">Feed URL token</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Your feed URLs contain a private token. Rotating it immediately
            invalidates every existing feed URL — re-copy them from the Feeds
            page afterwards.
          </p>
          <RotateTokenButton />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-base font-semibold">API keys</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Bearer keys for the REST API (<code className="font-mono">/api/v1</code>) —
            catalog push, sync triggers, feed URLs, audit results. Keys are
            hashed at rest and shown once at creation.
          </p>
          <ApiKeysPanel
            usage={usage}
            initialKeys={keys
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .map((k) => ({
                id: k.id,
                name: k.name,
                prefix: k.prefix,
                scopes: k.scopes as string[],
                lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
                revokedAt: k.revokedAt?.toISOString() ?? null,
                createdAt: k.createdAt.toISOString(),
              }))}
          />
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-1 text-base font-semibold">Webhooks</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            We sign and deliver <code className="font-mono">sync.completed</code>,{" "}
            <code className="font-mono">feeds.rendered</code>, and{" "}
            <code className="font-mono">audit.completed</code> events to your
            endpoints, with automatic retries. Signing secrets are shown once.
          </p>
          <WebhooksPanel initialWebhooks={webhookRows} />
        </Card>
        {keys.length > 0 && (
          <Card className="lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold">API usage</h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                {total30d.toLocaleString()} requests / 30 days
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Authenticated requests per day across all keys — limit is 60
              requests/minute per key. Also available as{" "}
              <Link href="/docs/api/usage" className="underline hover:text-foreground">
                <code className="font-mono">GET /api/v1/usage</code>
              </Link>
              .
            </p>
            {total30d === 0 ? (
              <p className="text-sm text-muted-foreground">
                No API requests yet — counts appear here as soon as a key is
                used.
              </p>
            ) : (
              <UsageChart days={days} />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
