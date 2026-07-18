import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { getOrCreateDemoMerchant } from "@/demo/seed";
import { Badge, Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const AVAILABILITY_TONE: Record<string, "success" | "danger" | "warning" | "neutral"> = {
  in_stock: "success",
  out_of_stock: "danger",
  pre_order: "warning",
  backorder: "warning",
  unknown: "neutral",
};

export default async function DemoDashboard() {
  const db = getDb();
  const merchantId = await getOrCreateDemoMerchant(db);
  const scope = forMerchant(db, merchantId);
  const products = await scope.products.list();
  const withGtin = products.filter((p) => p.gtin).length;

  return (
    <>
      <PageHeader
        title="Alpine Outdoor Supply"
        description="A sample WooCommerce-style catalog — imperfect on purpose, like real catalogs are."
      />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="mt-1 text-2xl font-semibold">{products.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">With GTIN</p>
          <p className="mt-1 text-2xl font-semibold">
            {withGtin}
            <span className="ml-1 text-sm font-normal text-muted-foreground">/ {products.length}</span>
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Sources</p>
          <p className="mt-1 text-2xl font-semibold">1</p>
        </Card>
      </div>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">GTIN</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{p.externalId}</td>
                <td className="max-w-64 truncate px-4 py-2.5">{p.title ?? "—"}</td>
                <td className="px-4 py-2.5">{p.brand ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {p.priceMinor != null ? `${(p.priceMinor / 100).toFixed(2)} EUR` : "—"}
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
  );
}
