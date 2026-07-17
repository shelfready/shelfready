import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { merchants, sources } from "@/db/schema";
import { getConnector } from "@/connectors/registry";
import { runSync } from "@/connectors/sync";
import { runDriftCheck } from "./drift";
import "@/connectors/csv";
import "@/connectors/woocommerce";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/** All enabled pull-capable sources, synced; failures isolated per source. */
export async function runScheduledSyncs(db: AnyDb) {
  const all = await db.select().from(sources).where(eq(sources.enabled, true));
  let synced = 0;
  let failed = 0;
  for (const source of all) {
    try {
      if (!getConnector(source.type).capabilities.pull) continue;
      await runSync(db, source.merchantId, source.id);
      synced++;
    } catch {
      failed++;
    }
  }
  return { sources: all.length, synced, failed };
}

/** Drift check for every merchant with products; failures isolated. */
export async function runScheduledDriftChecks(db: AnyDb) {
  const all = await db.select({ id: merchants.id }).from(merchants);
  let checked = 0;
  let failed = 0;
  for (const merchant of all) {
    try {
      await runDriftCheck(db, merchant.id);
      checked++;
    } catch {
      failed++;
    }
  }
  return { merchants: all.length, checked, failed };
}
