"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Spinner } from "@/components/ui";

export function ConnectWoo() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    baseUrl: "",
    consumerKey: "",
    consumerSecret: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sources/woocommerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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
      <Input placeholder="Source name (e.g. My Store)" value={form.name} onChange={set("name")} />
      <Input placeholder="Store URL (https://…)" value={form.baseUrl} onChange={set("baseUrl")} />
      <Input placeholder="Consumer key (ck_…)" value={form.consumerKey} onChange={set("consumerKey")} />
      <Input
        placeholder="Consumer secret (cs_…)"
        type="password"
        value={form.consumerSecret}
        onChange={set("consumerSecret")}
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Button onClick={() => void submit()} disabled={busy || !form.baseUrl}>
        {busy ? <Spinner /> : null}
        {busy ? "Testing connection…" : "Connect store"}
      </Button>
    </div>
  );
}

export function SyncNowButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");

  async function sync() {
    setState("busy");
    const res = await fetch(`/api/sources/${sourceId}/sync`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setState(`failed: ${data.error ?? res.status}`);
    setState(`${data.stats.upserted} upserted, ${data.stats.rejected} rejected`);
    router.refresh();
  }

  return (
    <Button variant="secondary" size="sm" onClick={() => void sync()} disabled={state === "busy"}>
      {state === "busy" ? <Spinner /> : null}
      {state === "idle" ? "Sync now" : state === "busy" ? "Syncing…" : state}
    </Button>
  );
}
