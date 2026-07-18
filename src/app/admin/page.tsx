import { Boxes, Package, TrendingUp, Users } from "lucide-react";
import { getDb } from "@/db";
import { adminOverview } from "@/admin/queries";
import { requireAdmin } from "@/lib/require-admin";
import { PLANS, isPlanId } from "@/billing/plans";
import { timeAgo } from "@/lib/time";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const data = await adminOverview(getDb());

  const planOrder = ["free", "starter", "growth", "scale"] as const;
  const paying = planOrder
    .filter((p) => p !== "free")
    .reduce((sum, p) => sum + (data.planCounts[p] ?? 0), 0);
  const mrr = planOrder.reduce(
    (sum, p) => sum + (data.planCounts[p] ?? 0) * PLANS[p].priceUsdMonthly,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The whole business at a glance. Expanded metrics land with #117.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Merchants"
          value={data.merchants.toLocaleString()}
          icon={<Boxes className="size-4" />}
          hint={`${paying} paying · $${mrr.toLocaleString()} MRR (test mode)`}
          accent="primary"
        />
        <StatCard
          label="Users"
          value={data.users.toLocaleString()}
          icon={<Users className="size-4" />}
          hint={`${data.signups30d} joined in 30d`}
          accent="brand"
        />
        <StatCard
          label="Signups (7d)"
          value={data.signups7d.toLocaleString()}
          icon={<TrendingUp className="size-4" />}
          hint={`${data.signups30d} in 30d`}
          accent="primary"
        />
        <StatCard
          label="SKUs under management"
          value={data.skus.toLocaleString()}
          icon={<Package className="size-4" />}
          hint="across all catalogs"
          accent="neutral"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-sm font-semibold">Plan distribution</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {planOrder.map((p) => {
              const n = data.planCounts[p] ?? 0;
              const pct =
                data.merchants === 0 ? 0 : Math.round((n / data.merchants) * 100);
              return (
                <li key={p}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{PLANS[p].label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={p === "free" ? "h-full bg-muted-foreground/40" : "h-full bg-brand"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
            {Object.keys(data.planCounts)
              .filter((p) => !isPlanId(p))
              .map((p) => (
                <li key={p} className="text-xs text-muted-foreground">
                  Unknown plan “{p}”: {data.planCounts[p]}
                </li>
              ))}
          </ul>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold">Recent signups</h2>
          {data.recentSignups.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Merchant</th>
                    <th className="py-2 pr-3">Plan</th>
                    <th className="py-2 pr-3 text-right">Products</th>
                    <th className="py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSignups.map((u) => (
                    <tr key={u.userId} className="border-t border-border/60">
                      <td className="max-w-52 py-2 pr-3">
                        <p className="truncate font-medium">{u.name ?? "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="max-w-40 truncate py-2 pr-3">{u.merchantName ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{u.plan ?? "—"}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{u.products}</td>
                      <td className="py-2 text-muted-foreground">{timeAgo(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
