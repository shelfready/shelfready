import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getDb } from "@/db";
import { getStatusPageData } from "@/status/components";
import { requireAdmin } from "@/lib/require-admin";
import { timeAgo } from "@/lib/time";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IncidentUpdateForm, OpenIncidentForm } from "./incident-forms";

const STATE_DOT: Record<string, string> = {
  operational: "bg-brand",
  degraded: "bg-accent-amber",
  outage: "bg-destructive",
};

export default async function AdminStatusPage() {
  await requireAdmin();
  const data = await getStatusPageData(getDb());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What visitors see on{" "}
            <Link href="/status" className="inline-flex items-center gap-1 underline hover:text-foreground">
              /status <ExternalLink className="size-3" />
            </Link>{" "}
            — open incidents here; automated heartbeat signals degrade
            components on their own.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            data.overall === "operational"
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-accent-amber/40 bg-accent-amber/15 text-accent-amber-foreground",
          )}
        >
          overall: {data.overall}
        </Badge>
      </div>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold">Components</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.components.map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-sm">
              <span className={cn("size-2 rounded-full", STATE_DOT[c.state])} />
              {c.name}
              <span className="ml-auto text-xs text-muted-foreground">
                {c.state}
                {c.autoSignal ? " · auto" : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold">Open an incident</h2>
        <OpenIncidentForm
          components={data.components.map((c) => ({ id: c.id, name: c.name }))}
        />
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 text-sm font-semibold">
          Active incidents ({data.activeIncidents.length})
        </h2>
        {data.activeIncidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">None — all quiet.</p>
        ) : (
          <div className="grid gap-4">
            {data.activeIncidents.map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{i.title}</p>
                  <Badge variant="outline">{i.severity}</Badge>
                  <Badge variant="outline">{i.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    opened {timeAgo(i.createdAt)}
                    {i.componentNames.length > 0 && ` · ${i.componentNames.join(", ")}`}
                  </span>
                </div>
                <IncidentUpdateForm incidentId={i.id} currentStatus={i.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {data.pastIncidents.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold">
            Resolved ({data.pastIncidents.length})
          </h2>
          <ul className="grid gap-2">
            {data.pastIncidents.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{i.title}</span>
                <Badge variant="outline">{i.severity}</Badge>
                <span className="text-xs text-muted-foreground">
                  {timeAgo(i.createdAt)}
                  {i.resolvedAt && ` → resolved ${timeAgo(i.resolvedAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
