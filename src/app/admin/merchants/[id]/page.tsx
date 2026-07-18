import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getDb } from "@/db";
import { adminMerchantDetail } from "@/admin/queries";
import { requireAdmin } from "@/lib/require-admin";
import { timeAgo } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

export default async function AdminMerchantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const data = await adminMerchantDetail(getDb(), id).catch(() => null);
  if (!data) notFound();

  const seller = (data.merchant.settings ?? {}) as {
    sellerName?: string;
    sellerUrl?: string;
    storeCountry?: string;
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/merchants"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All merchants
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{data.merchant.name}</h1>
          <Badge variant="outline">{data.merchant.plan}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.merchant.slug} · joined {timeAgo(data.merchant.createdAt)}
          {data.merchant.stripeCustomerId && (
            <>
              {" · "}
              <a
                href={`https://dashboard.stripe.com/test/customers/${data.merchant.stripeCustomerId}`}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                Stripe customer
              </a>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="mt-1 text-2xl font-semibold">{data.counts.products.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">
            {data.counts.variants.toLocaleString()} variants
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Last audit</p>
          <p className="mt-1 text-2xl font-semibold">
            {data.lastAudit?.score != null ? `${data.lastAudit.score}` : "—"}
            {data.lastAudit?.grade && (
              <span className="ml-1 text-base font-medium text-muted-foreground">
                {data.lastAudit.grade}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.lastAudit
              ? `${data.lastAudit.findings ?? 0} findings · ${timeAgo(data.lastAudit.at)}`
              : "never run"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Last render</p>
          <p className="mt-1 text-2xl font-semibold">
            {data.lastRender
              ? `${data.lastRender.eligible ?? 0}/${data.lastRender.items ?? 0}`
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.lastRender ? `eligible · ${timeAgo(data.lastRender.at)}` : "never rendered"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Seller settings</p>
          <p className="mt-1 truncate text-sm font-medium">
            {seller.sellerName ?? "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {seller.sellerUrl ?? "no URL"} · {seller.storeCountry ?? "no country"}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={`Members (${data.members.length})`}>
          <ul className="flex flex-col gap-2">
            {data.members.map((m) => (
              <li key={m.email} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Badge variant="outline">{m.role}</Badge>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={`Sources (${data.sources.length})`}>
          {data.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources connected.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.sources.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.type}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.lastSyncAt ? `synced ${timeAgo(s.lastSyncAt)}` : "never synced"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`API keys (${data.apiKeys.length})`}>
          {data.apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2">Name</th>
                  <th className="py-1.5 pr-2">Prefix</th>
                  <th className="py-1.5 pr-2 text-right">30d reqs</th>
                  <th className="py-1.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.apiKeys.map((k) => (
                  <tr key={k.prefix} className="border-t border-border/60">
                    <td className="py-1.5 pr-2">{k.name}</td>
                    <td className="py-1.5 pr-2 font-mono text-xs">{k.prefix}…</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">
                      {k.requests30d.toLocaleString()}
                    </td>
                    <td className="py-1.5">
                      {k.revoked ? (
                        <Badge variant="outline">revoked</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {k.lastUsedAt ? `used ${timeAgo(k.lastUsedAt)}` : "never used"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title={`Webhooks (${data.webhooks.length})`}>
          {data.webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks registered.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.webhooks.map((w) => (
                <li key={w.url} className="text-sm">
                  <p className="truncate font-mono text-xs">{w.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {(w.events as string[]).join(", ")}
                    {w.failed30d > 0 && (
                      <span className="ml-2 text-destructive">
                        {w.failed30d} failed deliveries in 30d
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
