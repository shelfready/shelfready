"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  CreditCard,
  LifeBuoy,
  Rss,
  Settings,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const nav = [
  { title: "Overview", href: "/dashboard", icon: BarChart3 },
  { title: "Sources", href: "/dashboard/sources", icon: Boxes },
  { title: "Audit", href: "/dashboard/audit", icon: ClipboardCheck },
  { title: "Enrichment", href: "/dashboard/enrichment", icon: Sparkles },
  { title: "Feeds", href: "/dashboard/feeds", icon: Rss },
];

const secondary = [
  { title: "Settings", href: "/dashboard/settings", icon: Settings },
  { title: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { title: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

export type QuotaInfo = {
  planLabel: string;
  used: number;
  max: number;
};

export function DashboardSidebar({ quota }: { quota: QuotaInfo }) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const pct = Math.min(100, Math.round((quota.used / quota.max) * 100));
  const left = Math.max(0, quota.max - quota.used);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Link href="/" aria-label="ShelfReady home">
          <Logo />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </p>
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.title}
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col gap-1">
          {secondary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary before:absolute before:-left-3 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.title}
              </Link>
            );
          })}

          <div className="mt-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {quota.planLabel} plan
              </span>
              <span className="text-xs text-muted-foreground">
                {quota.used.toLocaleString()} / {quota.max.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  pct >= 90 ? "bg-accent-amber" : "bg-brand",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {left === 0 ? (
                <>
                  SKU limit reached —{" "}
                  <Link href="/dashboard/billing" className="font-medium text-primary hover:underline">
                    upgrade
                  </Link>
                </>
              ) : (
                `${left.toLocaleString()} product slots left on this plan.`
              )}
            </p>
          </div>
        </div>
      </nav>
    </aside>
  );
}
