import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import type { TestDb } from "@/db/test-db";
import { createTestDb } from "@/db/test-db";
import { merchants } from "@/db/schema";
import { seedDemo } from "@/db/seed-data";
import { entitlementsFor } from "./plans";
import { processStripeEvent } from "./stripe-events";

let db: TestDb;
let close: () => Promise<void>;
let merchantId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  const seeded = await seedDemo(db, "-billing");
  merchantId = seeded.merchant.id;
});

afterAll(async () => {
  await close();
});

function fakeEvent(id: string, type: string, object: object): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

async function merchantRow() {
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId));
  return m;
}

describe("processStripeEvent", () => {
  it("applies checkout.session.completed: plan, entitlements, customer id", async () => {
    const result = await processStripeEvent(
      db,
      fakeEvent("evt_1", "checkout.session.completed", {
        client_reference_id: merchantId,
        customer: "cus_123",
        metadata: { plan: "growth" },
      }),
    );
    expect(result.applied).toBe(true);
    const m = await merchantRow();
    expect(m.plan).toBe("growth");
    expect(m.stripeCustomerId).toBe("cus_123");
    expect(m.entitlements).toEqual(entitlementsFor("growth"));
  });

  it("is idempotent: replaying the same event id is a no-op", async () => {
    const replay = await processStripeEvent(
      db,
      fakeEvent("evt_1", "checkout.session.completed", {
        client_reference_id: merchantId,
        customer: "cus_SHOULD_NOT_APPLY",
        metadata: { plan: "starter" },
      }),
    );
    expect(replay).toEqual({ applied: false, reason: "replay" });
    const m = await merchantRow();
    expect(m.plan).toBe("growth");
    expect(m.stripeCustomerId).toBe("cus_123");
  });

  it("downgrades on customer.subscription.deleted", async () => {
    const result = await processStripeEvent(
      db,
      fakeEvent("evt_2", "customer.subscription.deleted", {
        customer: "cus_123",
      }),
    );
    expect(result.applied).toBe(true);
    const m = await merchantRow();
    expect(m.plan).toBe("free");
    expect(m.entitlements).toEqual(entitlementsFor("free"));
  });

  it("applies subscription.updated by customer id and plan metadata", async () => {
    const result = await processStripeEvent(
      db,
      fakeEvent("evt_3", "customer.subscription.updated", {
        customer: "cus_123",
        status: "active",
        metadata: { plan: "scale" },
      }),
    );
    expect(result.applied).toBe(true);
    expect((await merchantRow()).plan).toBe("scale");
  });

  it("treats a non-active subscription as free", async () => {
    await processStripeEvent(
      db,
      fakeEvent("evt_4", "customer.subscription.updated", {
        customer: "cus_123",
        status: "unpaid",
        metadata: { plan: "scale" },
      }),
    );
    expect((await merchantRow()).plan).toBe("free");
  });

  it("applies customer.subscription.created like an update", async () => {
    const result = await processStripeEvent(
      db,
      fakeEvent("evt_4b", "customer.subscription.created", {
        customer: "cus_123",
        status: "active",
        metadata: { plan: "growth" },
      }),
    );
    expect(result.applied).toBe(true);
    expect((await merchantRow()).plan).toBe("growth");
  });

  it("records but does not apply unhandled event types", async () => {
    const result = await processStripeEvent(
      db,
      fakeEvent("evt_5", "invoice.finalized", {}),
    );
    expect(result.applied).toBe(false);
  });
});

describe("webhook signature primitives (as used by the route)", () => {
  const secret = "whsec_test_secret";
  const payload = JSON.stringify({
    id: "evt_sig",
    type: "checkout.session.completed",
    data: { object: {} },
  });

  it("accepts a correctly signed payload", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    const event = await Stripe.webhooks.constructEventAsync(
      payload,
      header,
      secret,
    );
    expect(event.id).toBe("evt_sig");
  });

  it("rejects a tampered payload", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret,
    });
    await expect(
      Stripe.webhooks.constructEventAsync(
        payload.replace("evt_sig", "evt_evil"),
        header,
        secret,
      ),
    ).rejects.toThrow(/signature/i);
  });

  it("rejects a signature from the wrong secret", async () => {
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_other",
    });
    await expect(
      Stripe.webhooks.constructEventAsync(payload, header, secret),
    ).rejects.toThrow(/signature/i);
  });
});
