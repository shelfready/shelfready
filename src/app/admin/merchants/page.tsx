import Link from "next/link";
import { getDb } from "@/db";
import { adminMerchantsList } from "@/admin/queries";
import { requireAdmin } from "@/lib/require-admin";
import { timeAgo } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLAN_FILTERS = ["all", "free", "starter", "growth", "scale"] as const;

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; plan?: string }>;
}) {
  await requireAdmin();
  const { q, plan } = await searchParams;
  const rows = await adminMerchantsList(getDb(), {
    q,
    plan: plan === "all" ? undefined : plan,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length.toLocaleString()} merchant{rows.length === 1 ? "" : "s"}
          {q ? ` matching “${q}”` : ""} — read-only support view.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/admin/merchants">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, slug, or owner email…"
          className="h-9 w-72 rounded-md border border-border bg-card px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
        />
        {plan && plan !== "all" && <input type="hidden" name="plan" value={plan} />}
        <button className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/85">
          Search
        </button>
        <div className="ml-auto flex gap-2">
          {PLAN_FILTERS.map((p) => (
            <Link
              key={p}
              href={`/admin/merchants?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(p === "all" ? {} : { plan: p }),
              }).toString()}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (plan ?? "all") === p
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {p}
            </Link>
          ))}
        </div>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Merchant</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-right">Products</th>
              <th className="px-4 py-3 text-right">Sources</th>
              <th className="px-4 py-3">Last sync</th>
              <th className="px-4 py-3 text-right">Audit</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No merchants match.
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-muted/40">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/merchants/${m.id}`} className="block">
                    <p className="font-medium hover:underline">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.slug}
                      {m.ownerEmail ? ` · ${m.ownerEmail}` : ""}
                    </p>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline">{m.plan}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.products}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{m.sources}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {m.lastSyncAt ? timeAgo(m.lastSyncAt) : "never"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {m.lastAuditScore != null ? m.lastAuditScore : "—"}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{timeAgo(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
