import Link from "next/link";
import type { ReactNode } from "react";
import { requireMerchant } from "@/lib/require-merchant";
import { signOut } from "@/auth";
import { BrandMark, Button } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", enabled: true },
  { href: "/dashboard/sources", label: "Sources", enabled: true },
  { href: "/dashboard/feeds", label: "Feeds", enabled: true },
  { href: "/dashboard/audit", label: "Audit", enabled: true },
  { href: "/dashboard/enrichment", label: "Enrichment", enabled: true },
  { href: "/dashboard/settings", label: "Settings", enabled: true },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, merchant } = await requireMerchant();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
        <Link href="/" className="flex items-center gap-2 px-5 py-5">
          <BrandMark className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight">ShelfReady</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) =>
            item.enabled ? (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.href}
                className="cursor-default rounded-lg px-3 py-2 text-sm text-slate-400"
                title="Coming soon"
              >
                {item.label}
                <span className="ml-2 text-[10px] uppercase tracking-wide">soon</span>
              </span>
            ),
          )}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
          Pre-release
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{merchant.name}</p>
            <p className="truncate text-xs text-slate-500">
              {session.user?.email} · {merchant.role}
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="secondary" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
