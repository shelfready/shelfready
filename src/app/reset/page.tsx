import Link from "next/link";
import { BrandMark, Card } from "@/components/ui";
import { ResetForm } from "./form";

export const metadata = { title: "Reset password — ShelfReady" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <BrandMark className="h-9 w-9" />
        <span className="text-xl font-semibold tracking-tight">ShelfReady</span>
      </Link>
      <Card className="w-full max-w-sm">
        <ResetForm token={token ?? null} email={email ?? null} />
      </Card>
    </main>
  );
}
