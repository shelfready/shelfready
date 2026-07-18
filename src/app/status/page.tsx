import type { Metadata } from "next";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/marketing/page-shell";
import { UptimeBar } from "@/components/marketing/uptime-bar";
import { getDb } from "@/db";
import {
  getStatusPageData,
  type ComponentState,
  type IncidentView,
} from "@/status/components";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Status",
  description: "Live status, incidents, and uptime history for ShelfReady systems.",
};

// DB-backed — rendered per request (no DB at build time); the report
// itself is cheap and /api/status carries the cacheable variant.
export const dynamic = "force-dynamic";

const STATE_META: Record<
  ComponentState,
  { label: string; dot: string; text: string }
> = {
  operational: { label: "Operational", dot: "bg-brand", text: "text-brand" },
  degraded: {
    label: "Degraded",
    dot: "bg-accent-amber",
    text: "text-accent-amber-foreground",
  },
  outage: { label: "Outage", dot: "bg-destructive", text: "text-destructive" },
};

const SEVERITY_BADGE: Record<string, string> = {
  minor: "bg-accent-amber/15 text-accent-amber-foreground",
  major: "bg-accent-amber/25 text-accent-amber-foreground",
  critical: "bg-destructive/10 text-destructive",
};

function IncidentCard({ incident }: { incident: IncidentView }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{incident.title}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            SEVERITY_BADGE[incident.severity],
          )}
        >
          {incident.severity}
        </span>
        {incident.componentNames.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {incident.componentNames.join(" · ")}
          </span>
        )}
      </div>
      <ol className="mt-4 flex flex-col gap-3 border-l border-border pl-4">
        {[...incident.updates].reverse().map((u, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[21.5px] top-1.5 size-2 rounded-full bg-muted-foreground/40" />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {u.status} · {timeAgo(u.createdAt)}
            </p>
            <p className="mt-0.5 text-sm leading-relaxed">{u.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function StatusPage() {
  const data = await getStatusPageData(getDb());
  const { report, overall } = data;

  const banner =
    overall === "operational"
      ? {
          icon: CheckCircle2,
          title: "All systems operational",
          cls: "border-brand/30 bg-brand/10",
          iconCls: "bg-brand/15 text-brand",
        }
      : overall === "degraded"
        ? {
            icon: AlertTriangle,
            title: "Degraded performance",
            cls: "border-accent-amber/30 bg-accent-amber/10",
            iconCls: "bg-accent-amber/15 text-accent-amber-foreground",
          }
        : {
            icon: AlertCircle,
            title: "Service outage",
            cls: "border-destructive/30 bg-destructive/10",
            iconCls: "bg-destructive/15 text-destructive",
          };

  // Past incidents grouped by month, newest month first.
  const pastByMonth = new Map<string, IncidentView[]>();
  for (const i of data.pastIncidents) {
    const key = i.createdAt.toISOString().slice(0, 7);
    const list = pastByMonth.get(key) ?? [];
    list.push(i);
    pastByMonth.set(key, list);
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <div className={`flex items-center gap-4 rounded-xl border p-5 ${banner.cls}`}>
            <span
              className={`flex size-11 items-center justify-center rounded-full ${banner.iconCls}`}
            >
              <banner.icon className="size-6" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{banner.title}</h1>
              <p className="text-sm text-muted-foreground">
                Updated{" "}
                {new Date(report.generatedAt).toLocaleString("en-GB", {
                  timeZone: "UTC",
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}{" "}
                UTC · live
              </p>
            </div>
          </div>

          {data.activeIncidents.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              {data.activeIncidents.map((i) => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">Components</h2>
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">
          {data.components.map((c) => {
            const meta = STATE_META[c.state];
            return (
              <li key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <span className={cn("flex items-center gap-1.5 text-sm font-medium", meta.text)}>
                    <span className={cn("size-2 rounded-full", meta.dot)} />
                    {meta.label}
                  </span>
                </div>
                {c.autoSignal === "jobs" && report.days.length > 0 && (
                  <div className="mt-3">
                    <UptimeBar history={report.days.map((d) => d.ratio)} />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {report.overallUptimePct != null &&
                        `${report.overallUptimePct}% of scheduled heartbeats received`}
                      {report.monitoringSince &&
                        ` · monitoring since ${new Date(report.monitoringSince).toLocaleDateString(
                          "en-GB",
                          { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" },
                        )}`}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Component states combine manually reported incidents with automated
          heartbeat monitoring — automated signals degrade components on their
          own, so this page never reports better than reality. Uptime bars
          appear only where we have real monitoring data; we publish exactly
          what we measure, no synthetic history.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-14 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">Past incidents</h2>
        {pastByMonth.size === 0 ? (
          <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No incidents recorded since monitoring began. When one happens, it
            will be documented here with a timeline and a post-mortem.
          </p>
        ) : (
          [...pastByMonth.entries()].map(([month, incidents]) => (
            <div key={month} className="mt-5">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </h3>
              <div className="flex flex-col gap-3">
                {incidents.map((i) => (
                  <IncidentCard key={i.id} incident={i} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </PageShell>
  );
}
