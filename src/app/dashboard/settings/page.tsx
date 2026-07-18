import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { sellerSettingsOf } from "@/feeds/render";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm, RotateTokenButton } from "./form";
import { ApiKeysPanel } from "./api-keys";

export default async function SettingsPage() {
  const { merchant } = await requireMerchant();
  const [m] = await getDb()
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const seller = sellerSettingsOf(m);

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
            initialKeys={(await forMerchant(getDb(), merchant.merchantId).apiKeys.list())
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
      </div>
    </div>
  );
}
