"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";

export function RunEnrichmentButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");

  async function run() {
    setState("busy");
    const res = await fetch("/api/enrichment/run", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setState(data.error?.slice(0, 80) ?? "failed");
    setState("idle");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {typeof state === "string" && state !== "idle" && state !== "busy" && (
        <span className="text-sm text-red-600">{state}</span>
      )}
      <Button size="sm" onClick={() => void run()} disabled={state === "busy"}>
        {state === "busy" ? <Spinner /> : null}
        {state === "busy" ? "Asking Claude…" : "Run enrichment"}
      </Button>
    </div>
  );
}

export function ProposalActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function review(decision: "approved" | "rejected") {
    setBusy(true);
    await fetch("/api/enrichment/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "review", proposalId, decision }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => void review("approved")} disabled={busy}>
        Approve
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void review("rejected")} disabled={busy}>
        Reject
      </Button>
    </div>
  );
}

export function ApplyApprovedButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function apply() {
    setBusy(true);
    await fetch("/api/enrichment/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply" }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <Button size="sm" onClick={() => void apply()} disabled={busy}>
      {busy ? <Spinner /> : null}
      Apply {count} approved
    </Button>
  );
}
