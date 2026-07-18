import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, ClipboardCheck, Rss, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { LinkButton } from "@/components/link-button";

const NAV = [
  { href: "/demo", label: "Dashboard", icon: BarChart3 },
  { href: "/demo/audit", label: "Audit", icon: ClipboardCheck },
  { href: "/demo/feeds", label: "Feeds", icon: Rss },
  { href: "/demo/enrichment", label: "Enrichment", icon: Sparkles },
];

export const metadata = { title: "Live demo" };

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-center gap-3 bg-primary px-4 py-2 text-sm text-primary-foreground">
        <span>
          You&apos;re viewing a <strong>live demo</strong> with sample data —
          everything here is the real product, read-only.
        </span>
        <Link
          href="/login"
          className="rounded-md bg-primary-foreground px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-foreground/90"
        >
          Connect your own store
        </Link>
      </div>
      <div className="flex flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar sm:flex">
          <div className="flex h-16 items-center border-b border-border px-5">
            <Logo />
          </div>
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-border p-4">
            <LinkButton href="/register" className="w-full">
              Start free
            </LinkButton>
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-muted/30 px-6 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
