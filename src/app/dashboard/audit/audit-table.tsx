"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, Loader2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RuleRow = {
  code: string;
  label: string;
  category: string;
  field: string;
  severity: "error" | "warning" | "info";
  weight: number;
  fixHint: string;
  affected: number;
  total: number;
  samples: { sku: string; title: string | null }[];
};

const severityMeta: Record<RuleRow["severity"], { label: string; className: string }> = {
  error: {
    label: "Critical",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  warning: {
    label: "Warning",
    className: "border-accent-amber/40 bg-accent-amber/15 text-accent-amber-foreground",
  },
  info: {
    label: "Info",
    className: "border-border bg-muted text-muted-foreground",
  },
};

type Filter = "all" | "error" | "warning" | "info" | "passing";

const filters: { label: string; value: Filter }[] = [
  { label: "All rules", value: "all" },
  { label: "Critical", value: "error" },
  { label: "Warning", value: "warning" },
  { label: "Info", value: "info" },
  { label: "Passing", value: "passing" },
];

export function AuditTable({
  rules,
  enrichmentAvailable,
}: {
  rules: RuleRow[];
  enrichmentAvailable: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selected = rules.find((r) => r.code === selectedCode) ?? null;

  const visible = rules.filter((r) => {
    if (filter === "all") return true;
    if (filter === "passing") return r.affected === 0;
    return r.affected > 0 && r.severity === filter;
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Rule</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Severity</th>
                <th className="px-4 py-3 font-medium">Coverage</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No rules match this filter.
                  </td>
                </tr>
              )}
              {visible.map((rule) => {
                const passing = rule.affected === 0;
                const pct =
                  rule.total === 0
                    ? 100
                    : Math.round(((rule.total - rule.affected) / rule.total) * 100);
                return (
                  <tr
                    key={rule.code}
                    onClick={() => setSelectedCode(rule.code)}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      selectedCode === rule.code && "bg-muted/60",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {passing ? (
                          <CheckCircle2 className="size-4 shrink-0 text-primary" />
                        ) : (
                          <span className="size-2 shrink-0 rounded-full bg-destructive" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium leading-tight">{rule.label}</p>
                          <p className="text-xs text-muted-foreground">{rule.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {passing ? (
                        <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                          Passing
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={severityMeta[rule.severity].className}>
                          {severityMeta[rule.severity].label}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              pct === 100 ? "bg-primary" : "bg-accent-amber",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RuleDetail
        rule={selected}
        enrichmentAvailable={enrichmentAvailable}
        onClose={() => setSelectedCode(null)}
      />
    </div>
  );
}

function RuleDetail({
  rule,
  enrichmentAvailable,
  onClose,
}: {
  rule: RuleRow | null;
  enrichmentAvailable: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");

  if (!rule) {
    return (
      <div className="hidden rounded-lg border border-dashed border-border bg-card/50 p-6 text-center lg:flex lg:flex-col lg:items-center lg:justify-center">
        <p className="text-sm text-muted-foreground">
          Select a rule to see failing products and fix guidance.
        </p>
      </div>
    );
  }

  async function autoFix() {
    setState("busy");
    const res = await fetch("/api/enrichment/run", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setState(data.error?.slice(0, 80) ?? "Enrichment failed.");
    router.push("/dashboard/enrichment");
  }

  return (
    <aside className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold leading-tight">{rule.label}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Field <code className="rounded bg-muted px-1 py-0.5 font-mono">{rule.field}</code> ·
            weight {rule.weight}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">Affected</p>
          <p className={cn("text-lg font-semibold", rule.affected > 0 ? "text-destructive" : "")}>
            {rule.affected.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md bg-muted/60 p-3">
          <p className="text-xs text-muted-foreground">Passing</p>
          <p className="text-lg font-semibold text-primary">
            {(rule.total - rule.affected).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs font-medium text-primary">How to fix</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{rule.fixHint}</p>
      </div>

      {rule.samples.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Sample failing products</p>
          <ul className="flex flex-col gap-2">
            {rule.samples.map((p) => (
              <li key={p.sku} className="rounded-md border border-border p-2">
                <p className="truncate text-sm font-medium">{p.title ?? "Untitled"}</p>
                <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rule.affected > 0 && enrichmentAvailable && (
        <>
          {typeof state === "string" && state !== "idle" && state !== "busy" && (
            <p className="mt-3 text-xs text-destructive">{state}</p>
          )}
          <Button
            className="mt-4 w-full"
            size="sm"
            onClick={() => void autoFix()}
            disabled={state === "busy"}
          >
            {state === "busy" ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {state === "busy" ? "Asking Claude…" : "Auto-fix with AI"}
          </Button>
        </>
      )}
    </aside>
  );
}
