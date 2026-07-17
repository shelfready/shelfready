import { enrichmentRequestedEvent, inngest, syncRequestedEvent } from "../client";

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

/** Durable enrichment batches (retries via Inngest). */
export const enrichCatalog = inngest.createFunction(
  { id: "enrich-catalog", triggers: [enrichmentRequestedEvent], retries: 2 },
  async ({ event }) => {
    const { getDb } = await import("@/db");
    const { runEnrichment } = await import("@/enrichment/engine");
    return runEnrichment(getDb(), event.data.merchantId);
  },
);
