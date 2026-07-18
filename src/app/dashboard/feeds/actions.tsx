"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RenderNowButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function render() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/feeds/render", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "render failed");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-destructive">{error}</span>}
      <Button onClick={() => void render()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {busy ? "Rendering…" : "Render all"}
      </Button>
    </div>
  );
}
