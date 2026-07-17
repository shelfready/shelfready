"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button, Input, Label, Spinner } from "@/components/ui";

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return setError(data.error ?? "Registration failed.");
    }
    await signIn("credentials", {
      email: form.email,
      password: form.password,
      callbackUrl: "/dashboard",
    });
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={set("name")} autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Password (min 10 characters)</Label>
        <Input id="password" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button onClick={() => void submit()} disabled={busy || !form.email || !form.password}>
        {busy ? <Spinner /> : null}
        Create account
      </Button>
    </div>
  );
}
