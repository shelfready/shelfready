"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button, Input, Label, Spinner } from "@/components/ui";

export function PasswordLoginForm() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) return setError("Wrong email or password.");
    window.location.href = "/dashboard";
  }

  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor="pw-email">Email</Label>
        <Input
          id="pw-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          autoComplete="email"
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="pw-password">Password</Label>
          <Link href="/reset" className="mb-1 text-xs text-brand-700 hover:underline">
            Forgot?
          </Link>
        </div>
        <Input
          id="pw-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          autoComplete="current-password"
          onKeyDown={(e) => e.key === "Enter" && !busy && void submit()}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button onClick={() => void submit()} disabled={busy || !form.email || !form.password}>
        {busy ? <Spinner /> : null}
        Sign in
      </Button>
    </div>
  );
}
