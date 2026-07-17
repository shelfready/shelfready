import Link from "next/link";
import { signIn } from "@/auth";
import { BrandMark, Button, Card, Input, Label } from "@/components/ui";

export const metadata = { title: "Sign in — ShelfReady" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <BrandMark className="h-9 w-9" />
        <span className="text-xl font-semibold tracking-tight">ShelfReady</span>
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
        <p className="mb-5 text-sm text-slate-500">
          We&apos;ll email you a magic link — no password needed.
        </p>
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
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@yourstore.com"
              autoComplete="email"
            />
          </div>
          <Button type="submit">Email me a sign-in link</Button>
        </form>
      </Card>
      <p className="mt-6 max-w-sm text-center text-xs text-slate-400">
        ShelfReady makes your store discoverable by AI shopping agents —
        compliant feeds, audits, and freshness monitoring.
      </p>
    </main>
  );
}
