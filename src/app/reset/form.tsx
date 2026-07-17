"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Spinner } from "@/components/ui";

export function ResetForm({ token, email }: { token: string | null; email: string | null }) {
  const [value, setValue] = useState(email ?? "");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "done" | string>("idle");

  async function requestReset() {
    setState("busy");
    await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    });
    setState("sent");
  }

  async function confirmReset() {
    setState("busy");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return setState(data.error ?? "Reset failed.");
    setState("done");
  }

  if (token && email) {
    if (state === "done") {
      return (
        <div className="text-center">
          <h1 className="mb-2 text-lg font-semibold">Password updated</h1>
          <p className="mb-4 text-sm text-slate-500">You can sign in with your new password now.</p>
          <Link href="/login" className="text-brand-700 underline">Go to sign in</Link>
        </div>
      );
    }
    return (
      <div className="grid gap-3">
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <div>
          <Label htmlFor="new-password">New password (min 10 characters)</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {typeof state === "string" && !["idle", "busy", "sent", "done"].includes(state) && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state}</p>
        )}
        <Button onClick={() => void confirmReset()} disabled={state === "busy" || !password}>
          {state === "busy" ? <Spinner /> : null}
          Set new password
        </Button>
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-slate-500">
          If an account exists for {value}, a reset link is on its way. It expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <p className="text-sm text-slate-500">We&apos;ll email you a reset link.</p>
      <div>
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="email"
        />
      </div>
      <Button onClick={() => void requestReset()} disabled={state === "busy" || !value}>
        {state === "busy" ? <Spinner /> : null}
        Send reset link
      </Button>
    </div>
  );
}
