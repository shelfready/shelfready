"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchMerchant } from "@/app/dashboard/switch-merchant";
import { cn } from "@/lib/utils";

const titles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/sources": "Catalog sources",
  "/dashboard/audit": "Readiness audit",
  "/dashboard/enrichment": "AI enrichment",
  "/dashboard/feeds": "Feeds",
  "/dashboard/settings": "Settings",
  "/dashboard/billing": "Billing",
  "/dashboard/support": "Support",
};

export type TopbarMerchant = { merchantId: string; name: string };
export type TopbarUser = { name: string; email: string };

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

type SearchResult = {
  id: string;
  sku: string;
  title: string | null;
  brand: string | null;
  availability: string;
  priceMinor: number | null;
  currency: string | null;
};

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onQueryChange(value: string) {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();
    if (query.length < 2) {
      setResults(null);
      setBusy(false);
      setOpen(false);
      return;
    }
    setBusy(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } finally {
        setBusy(false);
      }
    }, 250);
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search products, SKUs…"
        className="h-9 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />
      {busy && (
        <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
      {open && results && (
        <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No products match &ldquo;{q.trim()}&rdquo;.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title ?? "Untitled"}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {r.sku}
                      {r.brand ? ` · ${r.brand}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.priceMinor != null && (
                      <p className="text-sm tabular-nums">
                        {(r.priceMinor / 100).toFixed(2)} {r.currency ?? ""}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-xs",
                        r.availability === "in_stock" ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {r.availability.replaceAll("_", " ")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function DashboardTopbar({
  merchant,
  merchants,
  user,
  signOutAction,
}: {
  merchant: TopbarMerchant;
  merchants: TopbarMerchant[];
  user: TopbarUser;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <Logo />
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
                <span className="flex size-6 items-center justify-center rounded bg-primary text-xs font-semibold text-primary-foreground">
                  {initialsOf(merchant.name)}
                </span>
                <span className="max-w-40 truncate">{merchant.name}</span>
                <ChevronsUpDown className="size-3.5 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Stores</DropdownMenuLabel>
              {merchants.map((m) => (
                <DropdownMenuItem
                  key={m.merchantId}
                  onClick={() => {
                    if (m.merchantId !== merchant.merchantId) {
                      void switchMerchant(m.merchantId);
                    }
                  }}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded text-[10px] font-semibold",
                      m.merchantId === merchant.merchantId
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {initialsOf(m.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{m.name}</span>
                  {m.merchantId === merchant.merchantId && (
                    <Check className="size-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/sources" />}>
              <Plus className="size-4" />
              Connect a store
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-primary">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent-amber/30 text-xs font-semibold text-accent-amber-foreground">
                    {initialsOf(user.name)}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/billing" />}>
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/docs" />}>Documentation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOutAction()}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
