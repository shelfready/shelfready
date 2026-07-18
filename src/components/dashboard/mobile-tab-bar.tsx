"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, ClipboardCheck, Rss, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { title: "Overview", href: "/dashboard", icon: BarChart3 },
  { title: "Sources", href: "/dashboard/sources", icon: Boxes },
  { title: "Audit", href: "/dashboard/audit", icon: ClipboardCheck },
  { title: "Enrich", href: "/dashboard/enrichment", icon: Sparkles },
  { title: "Feeds", href: "/dashboard/feeds", icon: Rss },
];

export function MobileTabBar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-background/95 backdrop-blur lg:hidden">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
