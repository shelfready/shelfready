"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone } from "lucide-react";
import { Badge, Button, Input } from "@/components/ui";

const SEVERITIES = ["minor", "major", "critical"] as const;
const STATUSES = ["investigating", "identified", "monitoring", "resolved"] as const;

export function OpenIncidentForm({
  components,
}: {
  components: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("minor");
  const [selected, setSelected] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "open", title, severity, componentIds: selected, body }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "failed");
    }
    setTitle("");
    setBody("");
    setSelected([]);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <Input
        placeholder="Incident title (e.g. Elevated feed render latency)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        {SEVERITIES.map((s) => (
          <button
            key={s}
            onClick={() => setSeverity(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              severity === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        {components.map((c) => (
          <button
            key={c.id}
            onClick={() =>
              setSelected((prev) =>
                prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
              )
            }
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected.includes(c.id)
                ? "border-accent-amber/60 bg-accent-amber/20 text-accent-amber-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
      <textarea
        placeholder="First update — what's happening and what you're doing about it."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <Button onClick={() => void open()} disabled={busy || !title || !body} className="justify-self-start">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
        Open incident
      </Button>
    </div>
  );
}

export function IncidentUpdateForm({
  incidentId,
  currentStatus,
}: {
  incidentId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(
    (STATUSES.includes(currentStatus as (typeof STATUSES)[number])
      ? currentStatus
      : "investigating") as (typeof STATUSES)[number],
  );
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    setBusy(true);
    await fetch("/api/admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", incidentId, status, body }),
    });
    setBusy(false);
    setBody("");
    router.refresh();
  }

  return (
    <div className="mt-3 grid gap-2 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              status === s
                ? s === "resolved"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-accent-amber/60 bg-accent-amber/20 text-accent-amber-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Update text…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button size="sm" onClick={() => void post()} disabled={busy || !body}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Post
        </Button>
      </div>
      <Badge tone="neutral">current: {currentStatus}</Badge>
    </div>
  );
}
