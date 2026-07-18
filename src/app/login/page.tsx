import Link from "next/link";
import { oauthProviders, signIn } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordLoginForm } from "./password-form";

export const metadata = { title: "Sign in — ShelfReady" };

function Divider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      {label}
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function LoginPage() {
  const oauth = oauthProviders();

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to your ShelfReady workspace.
        </p>
      </div>

      {oauth.length > 0 && (
        <>
          <div className="grid gap-2">
            {oauth.map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  "use server";
                  await signIn(provider.id, { redirectTo: "/dashboard" });
                }}
              >
                <Button variant="outline" type="submit" className="w-full">
                  {provider.label}
                </Button>
              </form>
            ))}
          </div>
          <Divider label="or" />
        </>
      )}

      <PasswordLoginForm />

      <Divider label="or use a magic link" />

      <form
        action={async (formData) => {
          "use server";
          await signIn("email", {
            email: String(formData.get("email") ?? ""),
            redirectTo: "/dashboard",
          });
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="magic-email">Work email</Label>
          <Input
            id="magic-email"
            name="email"
            type="email"
            required
            placeholder="you@yourstore.com"
            autoComplete="email"
          />
        </div>
        <Button type="submit" variant="secondary" className="w-full">
          Email me a sign-in link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to ShelfReady?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}
