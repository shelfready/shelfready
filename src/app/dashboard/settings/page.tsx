import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { sellerSettingsOf } from "@/feeds/render";
import { Card, PageHeader } from "@/components/ui";
import { SettingsForm, RotateTokenButton } from "./form";

export default async function SettingsPage() {
  const { merchant } = await requireMerchant();
  const [m] = await getDb()
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const seller = sellerSettingsOf(m);

  return (
    <>
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
          <p className="mb-4 text-sm text-slate-500">
            Your feed URLs contain a private token. Rotating it immediately
            invalidates every existing feed URL — re-copy them from the Feeds
            page afterwards.
          </p>
          <RotateTokenButton />
        </Card>
      </div>
    </>
  );
}
