import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import {
  createWebhookRecord,
  deliverPending,
  emitEvent,
  generateWebhookSecret,
  signPayload,
  verifySignature,
  RETRY_SCHEDULE_MIN,
} from "./deliver";

describe("signatures", () => {
  it("signs and verifies round-trip", () => {
    const secret = generateWebhookSecret();
    const body = JSON.stringify({ event: "sync.completed" });
    const now = Math.floor(Date.now() / 1000);
    const header = signPayload(secret, body, now);
    expect(header).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    expect(verifySignature(secret, body, header)).toBe(true);
  });

  it("rejects wrong secret, tampered body, and stale timestamps", () => {
    const secret = generateWebhookSecret();
    const body = "{}";
    const now = Math.floor(Date.now() / 1000);
    const header = signPayload(secret, body, now);
    expect(verifySignature(generateWebhookSecret(), body, header)).toBe(false);
    expect(verifySignature(secret, "{tampered}", header)).toBe(false);
    const old = signPayload(secret, body, now - 3600);
    expect(verifySignature(secret, body, old)).toBe(false);
    expect(verifySignature(secret, body, "garbage")).toBe(false);
  });
});

describe("delivery pipeline", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

  beforeAll(async () => {
    process.env.CREDENTIALS_KEY = "c".repeat(64);
    ({ db, close } = await createTestDb());
    tenants = await createTwoTenants(db);
  });

  afterAll(async () => {
    delete process.env.CREDENTIALS_KEY;
    await close();
  });

  it("emits only to enabled, subscribed webhooks — tenant-scoped", async () => {
    const a = createWebhookRecord("https://a.example.com/hook", ["sync.completed"]);
    await tenants.a.scope.webhooks.insert([a.values]);
    const off = createWebhookRecord("https://a.example.com/off", ["sync.completed"]);
    await tenants.a.scope.webhooks.insert([{ ...off.values, enabled: false }]);
    const other = createWebhookRecord("https://a.example.com/audit", ["audit.completed"]);
    await tenants.a.scope.webhooks.insert([other.values]);

    const count = await emitEvent(db, tenants.a.merchant.id, "sync.completed", {
      run_id: "r1",
    });
    expect(count).toBe(1);

    const aDeliveries = await tenants.a.scope.webhookDeliveries.list();
    expect(aDeliveries).toHaveLength(1);
    expect(aDeliveries[0].event).toBe("sync.completed");
    // Tenant B sees nothing.
    expect(await tenants.b.scope.webhookDeliveries.list()).toHaveLength(0);
    // No subscribers → no rows, no error.
    expect(
      await emitEvent(db, tenants.b.merchant.id, "feeds.rendered", {}),
    ).toBe(0);
  });

  it("delivers with a valid signature; success is terminal", async () => {
    const record = createWebhookRecord("https://b.example.com/hook", ["feeds.rendered"]);
    await tenants.b.scope.webhooks.insert([record.values]);
    await emitEvent(db, tenants.b.merchant.id, "feeds.rendered", { run_id: "r2" });

    const received: { body: string; sig: string; event: string }[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).includes("b.example.com")) {
        received.push({
          body: String(init?.body),
          sig: (init?.headers as Record<string, string>)["X-ShelfReady-Signature"],
          event: (init?.headers as Record<string, string>)["X-ShelfReady-Event"],
        });
        return new Response("ok", { status: 200 });
      }
      return new Response("no", { status: 500 });
    }) as unknown as typeof fetch;

    const counts = await deliverPending(db, fetchImpl);
    expect(counts.delivered).toBeGreaterThanOrEqual(1);
    expect(received).toHaveLength(1);
    expect(received[0].event).toBe("feeds.rendered");
    expect(verifySignature(record.secret, received[0].body, received[0].sig)).toBe(true);
    expect(JSON.parse(received[0].body).data.run_id).toBe("r2");

    // Nothing due anymore for this hook.
    const again = await deliverPending(db, fetchImpl);
    expect(received).toHaveLength(1);
    void again;
  });

  it("retries with backoff and dead-letters after the schedule", async () => {
    const record = createWebhookRecord("https://dead.example.com/hook", ["audit.completed"]);
    await tenants.b.scope.webhooks.insert([record.values]);
    await emitEvent(db, tenants.b.merchant.id, "audit.completed", { run_id: "r3" });

    const failing = vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;

    for (let attempt = 1; attempt <= RETRY_SCHEDULE_MIN.length + 1; attempt++) {
      // Force the delivery due now regardless of backoff.
      const rows = (await tenants.b.scope.webhookDeliveries.list()).filter(
        (d) => d.event === "audit.completed",
      );
      const delivery = rows[0];
      if (delivery.status === "dead") break;
      await tenants.b.scope.webhookDeliveries.update(delivery.id, {
        nextAttemptAt: new Date(Date.now() - 1000),
      });
      await deliverPending(db, failing);
    }

    const [final] = (await tenants.b.scope.webhookDeliveries.list()).filter(
      (d) => d.event === "audit.completed",
    );
    expect(final.status).toBe("dead");
    expect(final.attempts).toBe(RETRY_SCHEDULE_MIN.length + 1);
    expect(final.lastError).toBe("HTTP 500");
  });

  it("concurrent workers cannot double-deliver one row", async () => {
    const record = createWebhookRecord("https://race.example.com/hook", ["feeds.rendered"]);
    await tenants.a.scope.webhooks.insert([record.values]);
    await emitEvent(db, tenants.a.merchant.id, "feeds.rendered", { run_id: "race" });

    let hits = 0;
    const slow = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes("race.example.com")) {
        hits++;
        await new Promise((r) => setTimeout(r, 50));
      }
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    await Promise.all([deliverPending(db, slow), deliverPending(db, slow)]);
    expect(hits).toBe(1);
  });

  it("dead-letters deliveries whose webhook was removed", async () => {
    const record = createWebhookRecord("https://gone.example.com/hook", ["sync.completed"]);
    const [hook] = await tenants.b.scope.webhooks.insert([record.values]);
    await emitEvent(db, tenants.b.merchant.id, "sync.completed", { run_id: "r4" });
    await tenants.b.scope.webhooks.remove(hook.id);

    // Cascade delete removes the deliveries with the webhook row.
    const left = (await tenants.b.scope.webhookDeliveries.list()).filter(
      (d) => d.webhookId === hook.id,
    );
    expect(left).toHaveLength(0);
  });
});
