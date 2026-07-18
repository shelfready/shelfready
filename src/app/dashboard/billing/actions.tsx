"use client";

import { useState } from "react";
import { Button, Spinner } from "@/components/ui";

export function UpgradeButton({ plan }: { plan: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "failed");
    window.location.href = data.url;
  }

  return (
    <div className="grid gap-1">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button size="sm" onClick={() => void upgrade()} disabled={busy}>
        {busy ? <Spinner /> : null}
        Upgrade
      </Button>
    </div>
  );
}

export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (res.ok) window.location.href = data.url;
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void open()} disabled={busy}>
      {busy ? <Spinner /> : null}
      Billing portal &amp; invoices
    </Button>
  );
}
