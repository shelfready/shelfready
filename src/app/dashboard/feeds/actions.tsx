"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spinner } from "@/components/ui";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard.writeText(new URL(value, location.origin).href);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied!" : "Copy URL"}
    </Button>
  );
}

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
      {error && <span className="text-sm text-red-600">{error}</span>}
      <Button size="sm" onClick={() => void render()} disabled={busy}>
        {busy ? <Spinner /> : null}
        {busy ? "Rendering…" : "Render now"}
      </Button>
    </div>
  );
}
