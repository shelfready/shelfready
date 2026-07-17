import Link from "next/link";
import { BrandMark, Card } from "@/components/ui";
import { RegisterForm } from "./form";

export const metadata = { title: "Create account — ShelfReady" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <BrandMark className="h-9 w-9" />
        <span className="text-xl font-semibold tracking-tight">ShelfReady</span>
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold">Create your account</h1>
        <p className="mb-5 text-sm text-slate-500">
          Free for up to 25 SKUs — feeds, audit, and fix-list included.
        </p>
        <RegisterForm />
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-700 underline">Sign in</Link>
        </p>
      </Card>
    </main>
  );
}
