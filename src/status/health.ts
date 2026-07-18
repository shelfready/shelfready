import { and, eq, gte } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { feedRuns, merchants } from "@/db/schema";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * Public status computed from real signals (#98): the hourly heartbeat
 * cron writes feed_runs rows against the system merchant; day coverage
 * (received/expected heartbeats) is the uptime series, and heartbeat
 * freshness is the background-jobs health check. No invented numbers —
 * before monitoring started, days simply aren't shown.
 */

const SYSTEM_SLUG = "shelfready-system";
export const HEARTBEAT_FRESH_MS = 2 * 60 * 60 * 1000; // two missed beats

export interface StatusReport {
  generatedAt: string;
  monitoringSince: string | null;
  lastHeartbeatAt: string | null;
  jobsHealthy: boolean;
  /** Oldest → newest, one entry per calendar day (UTC) since monitoring began (max 90). */
  days: { date: string; expected: number; received: number; ratio: number }[];
  overallUptimePct: number | null;
}

export async function getStatusReport(
  db: AnyDb,
  now = new Date(),
): Promise<StatusReport> {
  const [system] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.slug, SYSTEM_SLUG));

  const empty: StatusReport = {
    generatedAt: now.toISOString(),
    monitoringSince: null,
    lastHeartbeatAt: null,
    jobsHealthy: false,
    days: [],
    overallUptimePct: null,
  };
  if (!system) return empty;

  const windowStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const beats = await db
    .select({ startedAt: feedRuns.startedAt })
    .from(feedRuns)
    .where(
      and(
        eq(feedRuns.merchantId, system.id),
        eq(feedRuns.kind, "heartbeat"),
        eq(feedRuns.status, "succeeded"),
        gte(feedRuns.startedAt, windowStart),
      ),
    );
  if (beats.length === 0) return empty;

  const sorted = beats
    .map((b) => b.startedAt)
    .sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  const perDay = new Map<string, number>();
  for (const t of sorted) {
    const day = t.toISOString().slice(0, 10);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  const days: StatusReport["days"] = [];
  for (
    let d = new Date(first.toISOString().slice(0, 10));
    d.getTime() <= now.getTime();
    d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
  ) {
    const date = d.toISOString().slice(0, 10);
    const dayStart = new Date(`${date}T00:00:00Z`).getTime();
    // Partial days (monitoring start / today) expect fewer than 24 beats.
    const from = Math.max(dayStart, first.getTime());
    const to = Math.min(dayStart + 24 * 60 * 60 * 1000, now.getTime());
    const expected = Math.max(1, Math.floor((to - from) / (60 * 60 * 1000)));
    const received = perDay.get(date) ?? 0;
    days.push({
      date,
      expected,
      received,
      ratio: Math.min(1, received / expected),
    });
  }

  const totalExpected = days.reduce((s, d) => s + d.expected, 0);
  const totalReceived = days.reduce((s, d) => s + Math.min(d.received, d.expected), 0);

  return {
    generatedAt: now.toISOString(),
    monitoringSince: first.toISOString(),
    lastHeartbeatAt: last.toISOString(),
    jobsHealthy: now.getTime() - last.getTime() < HEARTBEAT_FRESH_MS,
    days,
    overallUptimePct:
      totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 10000) / 100 : null,
  };
}
