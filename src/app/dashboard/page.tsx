import Link from "next/link";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";

export default async function DashboardPage() {
  const { session, merchant } = await requireMerchant();
  const scope = forMerchant(getDb(), merchant.merchantId);
  const products = await scope.products.list();

  return (
    <main style={{ padding: "48px 24px", maxWidth: 900, margin: "0 auto" }}>
      <h1>{merchant.name}</h1>
      <p>
        Signed in as {session.user?.email} · role: {merchant.role} · merchant{" "}
        <code>{merchant.slug}</code>
      </p>
      <p>
        <Link href="/dashboard/sources">Catalog sources & upload →</Link>
      </p>

      <h2>Products ({products.length})</h2>
      {products.length === 0 ? (
        <p>
          No products yet — <Link href="/dashboard/sources">upload a catalog</Link>.
        </p>
      ) : (
        <table cellPadding={6}>
          <thead>
            <tr>
              <th align="left">SKU</th>
              <th align="left">Title</th>
              <th align="left">Brand</th>
              <th align="right">Price</th>
              <th align="left">Availability</th>
              <th align="left">GTIN</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 100).map((p) => (
              <tr key={p.id}>
                <td><code>{p.externalId}</code></td>
                <td>{p.title ?? "—"}</td>
                <td>{p.brand ?? "—"}</td>
                <td align="right">
                  {p.priceMinor != null
                    ? `${(p.priceMinor / 100).toFixed(2)} ${p.currency ?? ""}`
                    : "—"}
                </td>
                <td>{p.availability}</td>
                <td>{p.gtin ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
