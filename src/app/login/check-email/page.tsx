import Link from "next/link";
import { BrandMark, Card } from "@/components/ui";

export const metadata = { title: "Check your email — ShelfReady" };

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <BrandMark className="h-9 w-9" />
        <span className="text-xl font-semibold tracking-tight">ShelfReady</span>
      </Link>
      <Card className="w-full max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold">Check your email</h1>
        <p className="text-sm text-slate-500">
          We sent you a sign-in link. It&apos;s valid for 24 hours — if it
          doesn&apos;t arrive within a minute, check your spam folder.
        </p>
      </Card>
    </main>
  );
}
