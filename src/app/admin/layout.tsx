import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/require-admin";
import { AdminSidebar } from "./sidebar";

export const metadata = { title: "Admin — ShelfReady" };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { session } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center gap-2 bg-accent-amber px-4 py-1.5 text-xs font-medium text-accent-amber-foreground dark:text-background">
        <ShieldAlert className="size-3.5" />
        Admin area — internal only. Signed in as {session.user?.email}.{" "}
        <Link href="/dashboard" className="underline">
          Back to dashboard
        </Link>
      </div>
      <div className="flex flex-1 bg-muted/30">
        <AdminSidebar />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
