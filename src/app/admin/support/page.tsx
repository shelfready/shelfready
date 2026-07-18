import { requireAdmin } from "@/lib/require-admin";
import { Card } from "@/components/ui/card";

export default async function AdminSupportPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
      <Card className="p-8 text-sm text-muted-foreground">
        Contact-message inbox with status tracking. Ships with{" "}
        <a
          href="https://github.com/shelfready/shelfready/issues/119"
          className="underline hover:text-foreground"
        >
          #119
        </a>
        .
      </Card>
    </div>
  );
}
