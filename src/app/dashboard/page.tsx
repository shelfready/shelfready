import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { sellerSettingsOf } from "@/feeds/render";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { OnboardingChecklist } from "./onboarding";

const AVAILABILITY_TONE: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  in_stock: "success",
  out_of_stock: "danger",
  pre_order: "warning",
  backorder: "warning",
  unknown: "neutral",
};

export default async function DashboardPage() {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [products, sources, runs, [merchantRow]] = await Promise.all([
    scope.products.list(),
    scope.sources.list(),
    scope.feedRuns.list(),
    db.select().from(merchants).where(eq(merchants.id, merchant.merchantId)),
  ]);

  const withGtin = products.filter((p) => p.gtin).length;
  const seller = sellerSettingsOf(merchantRow);
  const onboarding = {
    hasSource: sources.length > 0,
    hasSellerSettings: Boolean(seller.sellerName && seller.sellerUrl && seller.storeCountry),
    feedsRendered: runs.some((r) => r.kind === "render" && r.status === "succeeded"),
    auditRun: runs.some((r) => r.kind === "audit" && r.status === "succeeded"),
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your catalog at a glance."
        action={
          <Link href="/dashboard/sources">
            <Button variant="secondary" size="sm">
              Manage sources
            </Button>
          </Link>
        }
      />

      <OnboardingChecklist state={onboarding} />

      {products.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Upload a CSV/XLSX catalog or connect your WooCommerce store — products land here validated and ready for AI-surface feeds."
          action={
            <Link href="/dashboard/sources">
              <Button>Add your catalog</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm text-slate-500">Products</p>
              <p className="mt-1 text-2xl font-semibold">{products.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">With GTIN</p>
              <p className="mt-1 text-2xl font-semibold">
                {withGtin}
                <span className="ml-1 text-sm font-normal text-slate-400">
                  / {products.length}
                </span>
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-500">Sources</p>
              <p className="mt-1 text-2xl font-semibold">{sources.length}</p>
            </Card>
          </div>

          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">GTIN</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 100).map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{p.externalId}</td>
                    <td className="max-w-64 truncate px-4 py-2.5">{p.title ?? "—"}</td>
                    <td className="px-4 py-2.5">{p.brand ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {p.priceMinor != null
                        ? `${(p.priceMinor / 100).toFixed(2)} ${p.currency ?? ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={AVAILABILITY_TONE[p.availability] ?? "neutral"}>
                        {p.availability.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">{p.gtin ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
