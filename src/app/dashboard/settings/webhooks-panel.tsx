"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DeliveryRow {
  id: string;
  event: string;
  status: "pending" | "succeeded" | "failed" | "dead";
  attempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
}

export interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  deliveries: DeliveryRow[];
}

const EVENTS = ["sync.completed", "feeds.rendered", "audit.completed"] as const;

const STATUS_TONE: Record<DeliveryRow["status"], "neutral" | "success" | "warning" | "danger"> = {
  pending: "warning",
  succeeded: "success",
  failed: "warning",
  dead: "danger",
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC";
}

export function WebhooksPanel({ initialWebhooks }: { initialWebhooks: WebhookRow[] }) {
  const [hooks, setHooks] = useState<WebhookRow[]>(initialWebhooks);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([...EVENTS]);
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/webhooks");
    if (res.ok) setHooks((await res.json()).webhooks);
  }

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "failed");
    setSecret(data.secret);
    setUrl("");
    void load();
  }

  async function remove(id: string) {
    await fetch("/api/settings/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void load();
  }

  function toggleEvent(e: string) {
    setEvents((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }

  return (
    <div className="grid gap-4">
      {secret && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="mb-2 font-medium text-primary">
            Copy this signing secret now — it won&apos;t be shown again.
          </p>
          <code className="block break-all rounded border border-border bg-background px-2 py-1 font-mono text-xs">
            {secret}
          </code>
          <button
            className="mt-2 text-xs text-primary underline"
            onClick={() => void navigator.clipboard.writeText(secret)}
          >
            Copy to clipboard
          </button>
        </div>
      )}

      <div className="grid gap-2">
        <div className="flex gap-2">
          <Input
            placeholder="https://yourapp.example/webhooks/shelfready"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button
            onClick={() => void create()}
            disabled={busy || !url || events.length === 0}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Add endpoint
          </Button>
        </div>
        <div className="flex flex-wrap gap-3">
          {EVENTS.map((e) => (
            <label key={e} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={events.includes(e)}
                onChange={() => toggleEvent(e)}
                className="accent-[var(--primary)]"
              />
              <code className="font-mono text-xs">{e}</code>
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {hooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No webhooks yet — register an endpoint and we&apos;ll sign and deliver{" "}
          <code className="font-mono text-xs">sync.completed</code>,{" "}
          <code className="font-mono text-xs">feeds.rendered</code>, and{" "}
          <code className="font-mono text-xs">audit.completed</code> events to it.
          See the{" "}
          <Link href="/docs/api/webhooks" className="underline hover:text-foreground">
            webhooks docs
          </Link>{" "}
          for signature verification.
        </p>
      ) : (
        <ul className="grid gap-2">
          {hooks.map((w) => (
            <li key={w.id} className="rounded-lg border border-border">
              <div className="flex items-center gap-3 p-3">
                <button
                  onClick={() => setOpen(open === w.id ? null : w.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {open === w.id ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-mono text-xs">{w.url}</span>
                  <span className="hidden shrink-0 gap-1 sm:flex">
                    {w.events.map((e) => (
                      <Badge key={e} tone="neutral">
                        {e}
                      </Badge>
                    ))}
                  </span>
                </button>
                <Button variant="secondary" size="sm" onClick={() => void remove(w.id)}>
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
              {open === w.id && (
                <div className="border-t border-border px-3 pb-3">
                  {w.deliveries.length === 0 ? (
                    <p className="pt-3 text-sm text-muted-foreground">
                      No deliveries yet — trigger a sync, render, or audit to
                      see events arrive here.
                    </p>
                  ) : (
                    <table className="mt-2 w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="py-1.5 pr-2">Event</th>
                          <th className="py-1.5 pr-2">Status</th>
                          <th className="py-1.5 pr-2 text-right">Attempts</th>
                          <th className="py-1.5 pr-2">When</th>
                          <th className="py-1.5">Detail</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.deliveries.map((d) => (
                          <tr key={d.id} className="border-t border-border/60">
                            <td className="py-1.5 pr-2 font-mono text-xs">{d.event}</td>
                            <td className="py-1.5 pr-2">
                              <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
                            </td>
                            <td className="py-1.5 pr-2 text-right tabular-nums">{d.attempts}</td>
                            <td className="py-1.5 pr-2 text-muted-foreground">
                              {fmtTime(d.createdAt)}
                            </td>
                            <td
                              className={cn(
                                "max-w-48 truncate py-1.5 text-xs",
                                d.lastError ? "text-destructive" : "text-muted-foreground",
                              )}
                            >
                              {d.lastError ??
                                (d.status === "pending" && d.nextAttemptAt
                                  ? `next try ${fmtTime(d.nextAttemptAt)}`
                                  : "—")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
