import { inngest, syncRequestedEvent } from "../client";

/** Durable wrapper around the sync pipeline (retries via Inngest). */
export const syncSource = inngest.createFunction(
  { id: "sync-source", triggers: [syncRequestedEvent], retries: 3 },
  async ({ event }) => {
    const { getDb } = await import("@/db");
    const { runSync } = await import("@/connectors/sync");
    const { merchantId, sourceId } = event.data;
    const { runId, stats } = await runSync(getDb(), merchantId, sourceId);
    return { runId, seen: stats.seen, upserted: stats.upserted, rejected: stats.rejected };
  },
);
