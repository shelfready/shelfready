"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * One email field, three ways in: OAuth (when configured), password, or
 * an emailed sign-in link — no duplicate forms (Kalin's UX feedback).
 */
export function LoginForm({ oauth }: { oauth: { id: string; label: string }[] }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "magic" | null>(null);

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setBusy(null);
      return setError("Wrong email or password.");
    }
    window.location.href = "/dashboard";
  }

  async function magicSignIn() {
    if (!email) return setError("Enter your email first — we'll send the link there.");
    setBusy("magic");
    setError(null);
    await signIn("email", { email, callbackUrl: "/dashboard" });
  }

  return (
    <div>
      {oauth.length > 0 && (
        <>
          <div className="grid gap-2">
            {oauth.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                className="w-full"
                onClick={() => void signIn(provider.id, { callbackUrl: "/dashboard" })}
              >
                {provider.label}
              </Button>
            ))}
          </div>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or continue with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={passwordSignIn} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@yourstore.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/reset" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy != null || !email || !password}>
          {busy === "password" ? <Loader2 className="animate-spin" /> : null}
          {busy === "password" ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={busy != null}
          onClick={() => void magicSignIn()}
        >
          {busy === "magic" ? <Loader2 className="animate-spin" /> : <Mail />}
          {busy === "magic" ? "Sending link…" : "Email me a sign-in link instead"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No password needed for the link — we&apos;ll email you a one-time
          sign-in URL.
        </p>
      </form>
    </div>
  );
}
