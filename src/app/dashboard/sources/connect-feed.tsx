"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Spinner } from "@/components/ui";

export function ConnectFeed() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", feedUrl: "", defaultCurrency: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sources/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        feedUrl: form.feedUrl,
        ...(form.defaultCurrency ? { defaultCurrency: form.defaultCurrency } : {}),
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "failed");
    router.refresh();
  }

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-3">
      <Input placeholder="Source name (e.g. Google Shopping feed)" value={form.name} onChange={set("name")} />
      <Input placeholder="Feed URL (https://…/feed.xml or .csv)" value={form.feedUrl} onChange={set("feedUrl")} />
      <Input
        placeholder="Currency for bare prices (optional, e.g. EUR)"
        maxLength={3}
        value={form.defaultCurrency}
        onChange={set("defaultCurrency")}
      />
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <Button onClick={() => void submit()} disabled={busy || !form.feedUrl || !form.name}>
        {busy ? <Spinner /> : null}
        {busy ? "Fetching feed…" : "Import feed"}
      </Button>
    </div>
  );
}
