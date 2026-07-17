"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";

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
    <Button size="sm" onClick={() => void run()} disabled={busy}>
      {busy ? <Spinner /> : null}
      {busy ? "Auditing…" : "Re-run audit"}
    </Button>
  );
}
