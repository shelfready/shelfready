import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { Badge, Card, PageHeader } from "@/components/ui";
import { UploadFlow } from "./upload";
import { ConnectWoo, SyncNowButton } from "./connect-woo";

export default async function SourcesPage() {
  const { merchant } = await requireMerchant();
  const scope = forMerchant(getDb(), merchant.merchantId);
  const sources = await scope.sources.list();

  return (
    <>
      <PageHeader
        title="Catalog sources"
        description="Where your products come from — file uploads and store connections."
      />

      {sources.length > 0 && (
        <Card className="mb-8 overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Last sync</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={s.type === "csv" ? "neutral" : "success"}>{s.type}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {s.lastSyncAt
                      ? new Date(s.lastSyncAt).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
                      : "never"}
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
          <p className="mb-4 text-sm text-slate-500">
            Works with any cart. We auto-detect your columns; you confirm the mapping.
          </p>
          <UploadFlow />
        </Card>
        <Card>
          <h2 className="mb-1 text-base font-semibold">Connect WooCommerce</h2>
          <p className="mb-4 text-sm text-slate-500">
            Create a <strong>read-only</strong> REST key under WooCommerce →
            Settings → Advanced → REST API. Credentials are encrypted at rest.
          </p>
          <ConnectWoo />
        </Card>
      </div>
    </>
  );
}
