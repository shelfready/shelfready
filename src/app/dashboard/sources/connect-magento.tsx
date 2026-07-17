"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Spinner } from "@/components/ui";

export function ConnectMagento() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", baseUrl: "", accessToken: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sources/magento", {
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
      <Input placeholder="Source name (e.g. My Magento Store)" value={form.name} onChange={set("name")} />
      <Input placeholder="Store URL (https://…)" value={form.baseUrl} onChange={set("baseUrl")} />
      <Input
        placeholder="Integration access token"
        type="password"
        value={form.accessToken}
        onChange={set("accessToken")}
      />
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Button onClick={() => void submit()} disabled={busy || !form.baseUrl || !form.accessToken}>
        {busy ? <Spinner /> : null}
        {busy ? "Testing connection…" : "Connect store"}
      </Button>
    </div>
  );
}
