import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark, Button } from "@/components/ui";

const NAV = [
  { href: "/demo", label: "Dashboard" },
  { href: "/demo/audit", label: "Audit" },
  { href: "/demo/feeds", label: "Feeds" },
  { href: "/demo/enrichment", label: "Enrichment" },
];

export const metadata = { title: "Live demo — ShelfReady" };

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center gap-3 bg-brand-900 px-4 py-2 text-sm text-white">
        <span>
          You&apos;re viewing a <strong>live demo</strong> with sample data —
          everything here is the real product, read-only.
        </span>
        <Link
          href="/login"
          className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-brand-900 hover:bg-brand-50"
        >
          Connect your own store
        </Link>
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-white sm:flex">
          <Link href="/" className="flex items-center gap-2 px-5 py-5">
            <BrandMark className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight">ShelfReady</span>
          </Link>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 px-5 py-4">
            <Link href="/login">
              <Button size="sm" className="w-full">Start free</Button>
            </Link>
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-slate-50 px-6 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
