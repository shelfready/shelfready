import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { UploadFlow } from "./upload";

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
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>Upload a CSV / XLSX catalog</h2>
      <UploadFlow />
    </main>
  );
}
