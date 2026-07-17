import Link from "next/link";
import { oauthProviders, signIn } from "@/auth";
import { BrandMark, Button, Card, Input, Label } from "@/components/ui";
import { PasswordLoginForm } from "./password-form";

export const metadata = { title: "Sign in — ShelfReady" };

export default function LoginPage() {
  const oauth = oauthProviders();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <BrandMark className="h-9 w-9" />
        <span className="text-xl font-semibold tracking-tight">ShelfReady</span>
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
        <p className="mb-5 text-sm text-slate-500">Welcome back.</p>

        {oauth.length > 0 && (
          <div className="mb-4 grid gap-2">
            {oauth.map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  "use server";
                  await signIn(provider.id, { redirectTo: "/dashboard" });
                }}
              >
                <Button variant="secondary" type="submit" className="w-full">
                  {provider.label}
                </Button>
              </form>
            ))}
            <div className="my-1 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
            </div>
          </div>
        )}

        <PasswordLoginForm />

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" /> or use a magic link{" "}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form
          action={async (formData) => {
            "use server";
            await signIn("email", {
              email: String(formData.get("email") ?? ""),
              redirectTo: "/dashboard",
            });
          }}
          className="grid gap-3"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@yourstore.com" autoComplete="email" />
          </div>
          <Button type="submit" variant="secondary">
            Email me a sign-in link
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-sm text-slate-500">
        New here?{" "}
        <Link href="/register" className="text-brand-700 underline">
          Create a free account
        </Link>
      </p>
    </main>
  );
}
