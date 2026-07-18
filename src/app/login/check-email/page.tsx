import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata = { title: "Check your email — ShelfReady" };

export default function CheckEmailPage() {
  return (
    <AuthShell>
      <div className="flex flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent you a sign-in link. It&apos;s valid for 24 hours — if it
          doesn&apos;t arrive within a minute, check your spam folder.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
