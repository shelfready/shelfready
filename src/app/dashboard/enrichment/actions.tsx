"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <span className="text-sm text-destructive">{state}</span>
      )}
      <Button onClick={() => void run()} disabled={state === "busy"}>
        {state === "busy" ? <Loader2 className="animate-spin" /> : <Sparkles />}
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
      <Button size="sm" className="flex-1" onClick={() => void review("approved")} disabled={busy}>
        <Check />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="flex-1"
        onClick={() => void review("rejected")}
        disabled={busy}
      >
        <X />
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
    <Button variant="outline" onClick={() => void apply()} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Check />}
      Apply {count} approved
    </Button>
  );
}
