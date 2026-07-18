"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessageActions({
  id,
  status,
}: {
  id: string;
  status: "new" | "replied" | "closed";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: "new" | "replied" | "closed") {
    setBusy(true);
    await fetch("/api/admin/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1.5">
      {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      {status !== "replied" && (
        <Button size="sm" variant="outline" onClick={() => void set("replied")} disabled={busy}>
          <Check />
          Replied
        </Button>
      )}
      {status !== "closed" && (
        <Button size="sm" variant="ghost" onClick={() => void set("closed")} disabled={busy}>
          <X />
          Close
        </Button>
      )}
      {status === "closed" && (
        <Button size="sm" variant="ghost" onClick={() => void set("new")} disabled={busy}>
          <RotateCcw />
          Reopen
        </Button>
      )}
    </div>
  );
}
