import { cron } from "inngest";
import { inngest } from "../client";

/**
 * M5 freshness schedules. Logic lives in plain functions (sync.ts /
 * drift.ts) so tests never need an Inngest runtime.
 */

/** Re-sync every enabled pull source (render + audit cascade follow). */
export const syncScheduler = inngest.createFunction(
  { id: "sync-scheduler", triggers: [cron("0 */6 * * *")] },
  async () => {
    const { getDb } = await import("@/db");
    const { runScheduledSyncs } = await import("@/freshness/schedule");
    return runScheduledSyncs(getDb());
  },
);

/** Deliver due webhook payloads (pending + retry backlog). */
export const webhookDeliverer = inngest.createFunction(
  { id: "webhook-deliverer", triggers: [cron("*/5 * * * *")] },
  async () => {
    const { getDb } = await import("@/db");
    const { deliverPending } = await import("@/webhooks/deliver");
    return deliverPending(getDb());
  },
);

/** Daily drift check per merchant, with owner email digests. */
export const driftChecker = inngest.createFunction(
  { id: "drift-checker", triggers: [cron("30 5 * * *")] },
  async () => {
    const { getDb } = await import("@/db");
    const { runScheduledDriftChecks } = await import("@/freshness/schedule");
    return runScheduledDriftChecks(getDb());
  },
);

/** Nightly API-usage retention: drop counters older than 90 days (#108). */
export const usagePruner = inngest.createFunction(
  { id: "usage-pruner", triggers: [cron("15 4 * * *")] },
  async () => {
    const { getDb } = await import("@/db");
    const { pruneApiUsage } = await import("@/db/tenant");
    await pruneApiUsage(getDb());
    return { ok: true };
  },
);
