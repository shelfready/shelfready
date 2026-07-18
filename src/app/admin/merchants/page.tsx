import { requireAdmin } from "@/lib/require-admin";
import { Card } from "@/components/ui/card";

export default async function AdminMerchantsPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Merchants</h1>
      <Card className="p-8 text-sm text-muted-foreground">
        Merchant list, search, and per-merchant detail for support lookups. Ships with{" "}
        <a
          href="https://github.com/shelfready/shelfready/issues/118"
          className="underline hover:text-foreground"
        >
          #118
        </a>
        .
      </Card>
    </div>
  );
}
