import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { feedRuns, merchants } from "@/db/schema";
import { cron } from "inngest";
import { demoEchoEvent, inngest } from "../client";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * Writes one `feed_runs` heartbeat row against the system demo merchant
 * (created if missing). Separated from the Inngest wrapper so tests hit
 * the logic directly (PGlite) without an Inngest runtime.
 */
export async function recordHeartbeat(db: AnyDb) {
  const slug = "shelfready-system";
  let [system] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.slug, slug));
  system ??= (
    await db
      .insert(merchants)
      .values({ name: "ShelfReady System", slug })
      .returning()
  )[0];

  const [run] = await db
    .insert(feedRuns)
    .values({
      merchantId: system.id,
      kind: "heartbeat",
      status: "succeeded",
      stats: { at: new Date().toISOString() },
      finishedAt: new Date(),
    })
    .returning();
  return run;
}

export const heartbeat = inngest.createFunction(
  { id: "heartbeat", triggers: [cron("0 * * * *")] },
  async () => {
    const { getDb } = await import("@/db");
    const run = await recordHeartbeat(getDb());
    return { runId: run.id };
  },
);

export const demoEcho = inngest.createFunction(
  { id: "demo-echo", triggers: [demoEchoEvent] },
  async ({ event }) => ({ echoed: event.data.message }),
);
