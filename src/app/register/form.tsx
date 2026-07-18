"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  const [form, setForm] = useState({ name: "", email: "", storeUrl: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strength = getStrength(form.password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name || undefined,
        email: form.email,
        password: form.password,
        storeUrl: form.storeUrl || undefined,
      }),
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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Jordan Diaz" value={form.name} onChange={set("name")} autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@yourstore.com"
          required
          value={form.email}
          onChange={set("email")}
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="storeUrl">
          Store URL <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="storeUrl"
          placeholder="yourstore.com"
          value={form.storeUrl}
          onChange={set("storeUrl")}
          autoComplete="url"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="At least 10 characters"
          required
          value={form.password}
          onChange={set("password")}
          autoComplete="new-password"
        />
        <div className="mt-1 flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : "bg-muted"}`}
            />
          ))}
        </div>
        {form.password ? (
          <p className="text-xs text-muted-foreground">{strength.label}</p>
        ) : null}
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="mt-1 w-full"
        disabled={busy || !form.email || !form.password}
      >
        {busy ? <Loader2 className="animate-spin" /> : null}
        {busy ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}

// Mirrors passwordPolicyError's 10-char minimum in src/lib/password.ts.
function getStrength(password: string) {
  if (password.length < 10) {
    return { score: 0, label: "Too short — 10 characters minimum", color: "bg-destructive" };
  }
  let score = 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map = [
    { label: "Too short — 10 characters minimum", color: "bg-destructive" },
    { label: "Weak", color: "bg-accent-amber" },
    { label: "Fair", color: "bg-accent-amber" },
    { label: "Good", color: "bg-primary" },
    { label: "Strong", color: "bg-primary" },
  ];
  const meta = map[score];
  return { score, label: meta.label, color: meta.color };
}
