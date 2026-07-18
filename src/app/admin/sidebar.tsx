"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, LifeBuoy, Store } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const nav = [
  { title: "Overview", href: "/admin", icon: BarChart3 },
  { title: "Merchants", href: "/admin/merchants", icon: Store },
  { title: "Support", href: "/admin/support", icon: LifeBuoy },
  { title: "Status", href: "/admin/status", icon: Activity },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Link href="/" aria-label="ShelfReady home">
          <Logo />
        </Link>
        <span className="rounded bg-accent-amber/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-amber-foreground">
          Admin
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
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
      </nav>
    </aside>
  );
}
