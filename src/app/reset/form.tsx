"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetForm({ token, email }: { token: string | null; email: string | null }) {
  const [value, setValue] = useState(email ?? "");
  const [password, setPassword] = useState("");
  // "idle" | "busy" | "sent" | "done" | anything else = error message.
  const [state, setState] = useState<string>("idle");

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value }),
    });
    setState("sent");
  }

  async function confirmReset(e: React.FormEvent) {
    e.preventDefault();
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

  const error =
    !["idle", "busy", "sent", "done"].includes(state) ? state : null;

  if (token && email) {
    if (state === "done") {
      return (
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can sign in with your new password now.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" />
            Go to sign in
          </Link>
        </div>
      );
    }
    return (
      <>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Setting a new password for{" "}
            <span className="font-medium text-foreground">{email}</span>.
          </p>
        </div>
        <form onSubmit={confirmReset} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="At least 10 characters"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={state === "busy" || !password}>
            {state === "busy" ? <Loader2 className="animate-spin" /> : null}
            {state === "busy" ? "Saving…" : "Set new password"}
          </Button>
        </form>
      </>
    );
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for{" "}
          <span className="font-medium text-foreground">{value}</span>, a reset
          link is on its way. It expires in 1 hour.
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={() => setState("idle")}>
          Use a different email
        </Button>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form onSubmit={requestReset} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-email">Work email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="you@yourstore.com"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={state === "busy" || !value}>
          {state === "busy" ? <Loader2 className="animate-spin" /> : null}
          {state === "busy" ? "Sending link…" : "Send reset link"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to sign in
      </Link>
    </>
  );
}
