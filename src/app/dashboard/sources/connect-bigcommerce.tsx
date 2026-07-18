"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Spinner } from "@/components/ui";

export function ConnectBigCommerce() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    storeHash: "",
    storefrontUrl: "",
    accessToken: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sources/bigcommerce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        storeHash: form.storeHash.trim(),
        accessToken: form.accessToken,
        ...(form.storefrontUrl ? { storefrontUrl: form.storefrontUrl } : {}),
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
      <Input placeholder="Source name (e.g. My BC Store)" value={form.name} onChange={set("name")} />
      <Input placeholder="Store hash (from api.bigcommerce.com/stores/…)" value={form.storeHash} onChange={set("storeHash")} />
      <Input placeholder="Storefront URL for product links (https://…)" value={form.storefrontUrl} onChange={set("storefrontUrl")} />
      <Input
        placeholder="API access token"
        type="password"
        value={form.accessToken}
        onChange={set("accessToken")}
      />
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <Button
        onClick={() => void submit()}
        disabled={busy || !form.storeHash || !form.accessToken}
      >
        {busy ? <Spinner /> : null}
        {busy ? "Testing connection…" : "Connect store"}
      </Button>
    </div>
  );
}
