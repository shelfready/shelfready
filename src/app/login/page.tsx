import Link from "next/link";
import { oauthProviders } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — ShelfReady" };

export default function LoginPage() {
  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your ShelfReady workspace.
        </p>
      </div>

      <LoginForm oauth={oauthProviders()} />

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to ShelfReady?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}
