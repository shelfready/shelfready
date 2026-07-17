import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, lte } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { webhookDeliveries, webhooks } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { decryptJson, encryptJson } from "@/lib/crypto";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * Outbound webhooks (#60). Emission is a transactional outbox — engines
 * write delivery rows and never block on the receiver; deliverPending
 * (Inngest cron + best-effort inline kick) does the HTTP work with
 * retries and a dead-letter status.
 */

export const WEBHOOK_EVENTS = [
  "sync.completed",
  "feeds.rendered",
  "audit.completed",
] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Minutes between attempts; after the last, the delivery is dead. */
export const RETRY_SCHEDULE_MIN = [1, 5, 30, 120, 720];
const TIMEOUT_MS = 10_000;

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

/** Stripe-style signature: HMAC-SHA256 over `<timestamp>.<body>`. */
export function signPayload(secret: string, body: string, timestampSec: number): string {
  const mac = createHmac("sha256", secret)
    .update(`${timestampSec}.${body}`)
    .digest("hex");
  return `t=${timestampSec},v1=${mac}`;
}

/** Receiver-side check (documented in /docs; also used in tests). */
export function verifySignature(
  secret: string,
  body: string,
  header: string,
  toleranceSec = 300,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=", 2) as [string, string]),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest();
  const given = Buffer.from(parts.v1 ?? "", "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createWebhookRecord(url: string, events: WebhookEvent[]) {
  const secret = generateWebhookSecret();
  return { secret, values: { url, secretEnc: encryptJson(secret), events } };
}

/** Write delivery rows for every enabled, subscribed webhook. Never throws. */
export async function emitEvent(
  db: AnyDb,
  merchantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<number> {
  try {
    const scope = forMerchant(db, merchantId);
    const hooks = (await scope.webhooks.list()).filter(
      (w) => w.enabled && (w.events as string[]).includes(event),
    );
    if (hooks.length === 0) return 0;
    const payload = {
      event,
      created_at: new Date().toISOString(),
      data,
    };
    await scope.webhookDeliveries.insert(
      hooks.map((w) => ({ webhookId: w.id, event, payload })),
    );
    return hooks.length;
  } catch {
    // Webhooks must never break the emitting job (sync/render/audit).
    return 0;
  }
}

/** Deliver everything due across all tenants; returns per-status counts. */
export async function deliverPending(
  db: AnyDb,
  fetchImpl: typeof fetch = fetch,
): Promise<{ delivered: number; failed: number; dead: number }> {
  // Cross-tenant read by design: the delivery worker serves all tenants.
  const due = await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        inArray(webhookDeliveries.status, ["pending", "failed"]),
        lte(webhookDeliveries.nextAttemptAt, new Date()),
      ),
    )
    .limit(100);

  const counts = { delivered: 0, failed: 0, dead: 0 };
  for (const delivery of due) {
    // Atomic claim: bump next_attempt_at iff still due, so concurrent
    // workers (cron + inline kicks) can't double-deliver one row. A
    // worker that dies mid-delivery leaves the row to retry in 60s.
    const claimed = await db
      .update(webhookDeliveries)
      .set({ nextAttemptAt: new Date(Date.now() + 60_000) })
      .where(
        and(
          eq(webhookDeliveries.id, delivery.id),
          inArray(webhookDeliveries.status, ["pending", "failed"]),
          lte(webhookDeliveries.nextAttemptAt, new Date()),
        ),
      )
      .returning();
    if (claimed.length === 0) continue;

    const [hook] = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.id, delivery.webhookId));
    if (!hook || !hook.enabled) {
      await db
        .update(webhookDeliveries)
        .set({ status: "dead", lastError: "webhook removed or disabled", updatedAt: new Date() })
        .where(eq(webhookDeliveries.id, delivery.id));
      counts.dead++;
      continue;
    }

    const body = JSON.stringify(delivery.payload);
    const signature = signPayload(
      decryptJson<string>(hook.secretEnc),
      body,
      Math.floor(Date.now() / 1000),
    );

    let ok = false;
    let responseStatus: number | null = null;
    let lastError: string | null = null;
    try {
      const res = await fetchImpl(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-ShelfReady-Signature": signature,
          "X-ShelfReady-Event": delivery.event,
          "User-Agent": "ShelfReady-Webhooks/1.0",
        },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      responseStatus = res.status;
      ok = res.ok;
      if (!ok) lastError = `HTTP ${res.status}`;
    } catch (e) {
      lastError = (e as Error).message;
    }

    const attempts = delivery.attempts + 1;
    if (ok) {
      await db
        .update(webhookDeliveries)
        .set({ status: "succeeded", attempts, responseStatus, lastError: null, updatedAt: new Date() })
        .where(eq(webhookDeliveries.id, delivery.id));
      counts.delivered++;
    } else {
      const retryMin = RETRY_SCHEDULE_MIN[attempts - 1];
      const dead = retryMin == null;
      await db
        .update(webhookDeliveries)
        .set({
          status: dead ? "dead" : "failed",
          attempts,
          responseStatus,
          lastError,
          nextAttemptAt: dead
            ? delivery.nextAttemptAt
            : new Date(Date.now() + retryMin * 60_000),
          updatedAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, delivery.id));
      counts[dead ? "dead" : "failed"]++;
    }
  }
  return counts;
}

/** Fire-and-forget kick after an inline emission (API/dashboard paths). */
export function kickDelivery(db: AnyDb) {
  void deliverPending(db).catch(() => undefined);
}
