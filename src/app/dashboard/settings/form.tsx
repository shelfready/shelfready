"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Spinner } from "@/components/ui";

export function SettingsForm({
  initial,
}: {
  initial: { sellerName: string; sellerUrl: string; storeCountry: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [state, setState] = useState<"idle" | "busy" | "saved" | string>("idle");

  async function save() {
    setState("busy");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) return setState(data.error ?? "failed");
    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 1500);
  }

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor="sellerName">Seller name</Label>
        <Input id="sellerName" value={form.sellerName} onChange={set("sellerName")} placeholder="Your Store GmbH" />
      </div>
      <div>
        <Label htmlFor="sellerUrl">Store URL</Label>
        <Input id="sellerUrl" value={form.sellerUrl} onChange={set("sellerUrl")} placeholder="https://yourstore.com" />
      </div>
      <div>
        <Label htmlFor="storeCountry">Store country (ISO-3166, e.g. DE)</Label>
        <Input
          id="storeCountry"
          value={form.storeCountry}
          maxLength={2}
          onChange={(e) =>
            setForm((f) => ({ ...f, storeCountry: e.target.value.toUpperCase() }))
          }
          placeholder="DE"
        />
      </div>
      {typeof state === "string" && state !== "idle" && state !== "busy" && state !== "saved" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state}</p>
      )}
      <Button onClick={() => void save()} disabled={state === "busy"}>
        {state === "busy" ? <Spinner /> : null}
        {state === "busy" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save & re-render feeds"}
      </Button>
    </div>
  );
}

export function RotateTokenButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function rotate() {
    if (!confirm("Rotate the feed token? All existing feed URLs stop working immediately.")) return;
    setBusy(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rotate-feed-token" }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={() => void rotate()} disabled={busy}>
      {busy ? <Spinner /> : null}
      Rotate feed token
    </Button>
  );
}
