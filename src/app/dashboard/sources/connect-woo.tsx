"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ display: "grid", gap: 8, maxWidth: 460 }}>
      <input placeholder="Source name (e.g. My Store)" value={form.name} onChange={set("name")} />
      <input placeholder="Store URL (https://…)" value={form.baseUrl} onChange={set("baseUrl")} />
      <input placeholder="Consumer key (ck_…)" value={form.consumerKey} onChange={set("consumerKey")} />
      <input placeholder="Consumer secret (cs_…)" type="password" value={form.consumerSecret} onChange={set("consumerSecret")} />
      {error && <p style={{ color: "#c00" }}>{error}</p>}
      <button onClick={() => void submit()} disabled={busy || !form.baseUrl}>
        {busy ? "Testing connection…" : "Connect (tests the connection first)"}
      </button>
    </div>
  );
}

export function SyncNowButton({ sourceId }: { sourceId: string }) {
  const router = useRouter();
  const [state, setState] = useState<string>("Sync now");

  async function sync() {
    setState("Syncing…");
    const res = await fetch(`/api/sources/${sourceId}/sync`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setState(`failed: ${data.error ?? res.status}`);
    setState(
      `done: ${data.stats.upserted} upserted, ${data.stats.rejected} rejected`,
    );
    router.refresh();
  }

  return <button onClick={() => void sync()}>{state}</button>;
}
