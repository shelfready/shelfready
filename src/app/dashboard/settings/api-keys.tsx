"use client";

import { useState } from "react";
import { Badge, Button, Input, Spinner } from "@/components/ui";

export interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export function ApiKeysPanel({ initialKeys }: { initialKeys: KeyRow[] }) {
  const [keys, setKeys] = useState<KeyRow[]>(initialKeys);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/api-keys");
    if (res.ok) setKeys((await res.json()).keys);
  }

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "failed");
    setCreated({ key: data.key });
    setName("");
    void load();
  }

  async function revoke(id: string) {
    await fetch("/api/settings/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    void load();
  }

  return (
    <div className="grid gap-4">
      {created && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="mb-2 font-medium text-primary">
            Copy this key now — it won&apos;t be shown again.
          </p>
          <code className="block break-all rounded border border-border bg-background px-2 py-1 font-mono text-xs">
            {created.key}
          </code>
          <button
            className="mt-2 text-xs text-primary underline"
            onClick={() => void navigator.clipboard.writeText(created.key)}
          >
            Copy to clipboard
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Key name (e.g. CI pipeline)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={() => void create()} disabled={busy || !name}>
          {busy ? <Spinner /> : null}
          Create key
        </Button>
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {keys.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Key</th>
              <th className="py-2 pr-2">Last used</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-2">{k.name}</td>
                <td className="py-2 pr-2 font-mono text-xs">{k.prefix}…</td>
                <td className="py-2 pr-2 text-muted-foreground">
                  {k.lastUsedAt
                    ? new Date(k.lastUsedAt).toLocaleString("en-GB", { timeZone: "UTC" }) + " UTC"
                    : "never"}
                </td>
                <td className="py-2 text-right">
                  {k.revokedAt ? (
                    <Badge tone="neutral">revoked</Badge>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => void revoke(k.id)}>
                      Revoke
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
