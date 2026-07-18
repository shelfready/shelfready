"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";

export function ReAuditButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    await fetch("/api/audit/run", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <Button onClick={() => void run()} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {busy ? "Auditing…" : "Re-run audit"}
    </Button>
  );
}

export function ExportCsvButton() {
  return (
    <LinkButton variant="outline" href="/api/audit/export" external>
      <Download />
      Export CSV
    </LinkButton>
  );
}
