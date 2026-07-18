import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageShell } from "@/components/marketing/page-shell";
import { UptimeBar } from "@/components/marketing/uptime-bar";
import { getDb } from "@/db";
import { getStatusReport } from "@/status/health";

export const metadata: Metadata = {
  title: "Status",
  description: "Live status and uptime history for ShelfReady systems.",
};

export const revalidate = 300;

export default async function StatusPage() {
  const report = await getStatusReport(getDb());
  // The web tier is trivially up if this page rendered; jobs come from
  // heartbeat freshness — the signal that actually catches failures.
  const systems = [
    {
      name: "Web application & API",
      description: "Dashboard, REST API, and hosted feed URLs.",
      healthy: true,
    },
    {
      name: "Background jobs",
      description: "Scheduled syncs, feed renders, audits, and webhook delivery.",
      healthy: report.jobsHealthy,
    },
  ];
  const allHealthy = systems.every((s) => s.healthy);

  return (
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <div
            className={`flex items-center gap-4 rounded-xl border p-5 ${
              allHealthy
                ? "border-brand/30 bg-brand/10"
                : "border-accent-amber/30 bg-accent-amber/10"
            }`}
          >
            <span
              className={`flex size-11 items-center justify-center rounded-full ${
                allHealthy ? "bg-brand/15 text-brand" : "bg-accent-amber/15 text-accent-amber"
              }`}
            >
              {allHealthy ? <CheckCircle2 className="size-6" /> : <AlertTriangle className="size-6" />}
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {allHealthy ? "All systems operational" : "Some systems degraded"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Updated{" "}
                {new Date(report.generatedAt).toLocaleString("en-GB", {
                  timeZone: "UTC",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                UTC · refreshes every 5 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight">Systems</h2>
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border bg-card">
          {systems.map((s) => (
            <li key={s.name} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
              <span
                className={`flex items-center gap-1.5 text-sm font-medium ${
                  s.healthy ? "text-brand" : "text-accent-amber"
                }`}
              >
                <span className={`size-2 rounded-full ${s.healthy ? "bg-brand" : "bg-accent-amber"}`} />
                {s.healthy ? "Operational" : "Degraded"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Uptime</h2>
            {report.overallUptimePct != null && (
              <span className="text-sm text-muted-foreground">
                {report.overallUptimePct}% of scheduled heartbeats received
              </span>
            )}
          </div>
          {report.days.length > 0 ? (
            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <UptimeBar history={report.days.map((d) => d.ratio)} />
              <p className="mt-3 text-xs text-muted-foreground">
                Measured from our hourly platform heartbeat, monitoring since{" "}
                {new Date(report.monitoringSince!).toLocaleDateString("en-GB", {
                  timeZone: "UTC",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . We publish exactly what we measure — no synthetic history.
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Monitoring data is not available yet.
            </p>
          )}
        </div>

        <div className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Incidents</h2>
          <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            No incidents recorded since monitoring began. When one happens, it will be
            documented here with a timeline and a post-mortem.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
