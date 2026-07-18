import { requireAdmin } from "@/lib/require-admin";
import { Card } from "@/components/ui/card";

export default async function AdminStatusPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
      <Card className="p-8 text-sm text-muted-foreground">
        Component states and incident management for the public status page. Ships with{" "}
        <a
          href="https://github.com/shelfready/shelfready/issues/120"
          className="underline hover:text-foreground"
        >
          #120
        </a>
        .
      </Card>
    </div>
  );
}
