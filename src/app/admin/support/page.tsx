import Link from "next/link";
import { Mail } from "lucide-react";
import { getDb } from "@/db";
import { adminContactMessages } from "@/admin/queries";
import { requireAdmin } from "@/lib/require-admin";
import { timeAgo } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageActions } from "./message-actions";

const FILTERS = ["all", "new", "replied", "closed"] as const;

const STATUS_STYLE: Record<string, string> = {
  new: "border-accent-amber/40 bg-accent-amber/15 text-accent-amber-foreground",
  replied: "border-primary/20 bg-primary/10 text-primary",
  closed: "border-border bg-muted text-muted-foreground",
};

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = FILTERS.includes(status as (typeof FILTERS)[number])
    ? (status as (typeof FILTERS)[number])
    : "all";
  const messages = await adminContactMessages(
    getDb(),
    filter === "all" ? undefined : filter,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact-form messages — stored before email delivery, so nothing
            is ever lost.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={f === "all" ? "/admin/support" : `/admin/support?status=${f}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {f}
            </Link>
          ))}
        </div>
      </div>

      {messages.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No {filter === "all" ? "" : `${filter} `}messages.
        </Card>
      ) : (
        <div className="grid gap-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{m.name}</p>
                    <span className="text-sm text-muted-foreground">{m.email}</span>
                    {m.topic && <Badge variant="outline">{m.topic}</Badge>}
                    <Badge variant="outline" className={STATUS_STYLE[m.status]}>
                      {m.status}
                    </Badge>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {m.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {timeAgo(m.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(
                      `Re: ${m.topic ?? "your message to ShelfReady"}`,
                    )}`}
                    className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[0.8rem] font-medium hover:bg-muted"
                  >
                    <Mail className="size-3.5" />
                    Reply
                  </a>
                  <MessageActions id={m.id} status={m.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
