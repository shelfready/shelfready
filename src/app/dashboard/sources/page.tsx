import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { UploadFlow } from "./upload";
import { ConnectWoo, SyncNowButton } from "./connect-woo";

export default async function SourcesPage() {
  const { merchant } = await requireMerchant();
  const scope = forMerchant(getDb(), merchant.merchantId);
  const sources = await scope.sources.list();

  return (
    <main style={{ padding: "48px 24px", maxWidth: 800, margin: "0 auto" }}>
      <h1>Catalog sources</h1>
      {sources.length > 0 && (
        <table cellPadding={6} style={{ margin: "16px 0" }}>
          <thead>
            <tr>
              <th align="left">Name</th>
              <th align="left">Type</th>
              <th align="left">Last sync</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.type}</td>
                <td>{s.lastSyncAt ? new Date(s.lastSyncAt).toISOString() : "never"}</td>
                <td>{s.type !== "csv" && <SyncNowButton sourceId={s.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Upload a CSV / XLSX catalog</h2>
      <UploadFlow />
      <h2 style={{ marginTop: 32 }}>Connect a WooCommerce store</h2>
      <p>
        Create a read-only REST API key in WooCommerce → Settings → Advanced →
        REST API, then connect it here. Credentials are encrypted at rest.
      </p>
      <ConnectWoo />
    </main>
  );
}
