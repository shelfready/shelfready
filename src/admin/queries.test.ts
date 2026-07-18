import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { memberships, merchants, users } from "@/db/schema";
import { adminOverview } from "./queries";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
  const [u1] = await db
    .insert(users)
    .values({ email: "owner-a@example.com", name: "Owner A" })
    .returning();
  await db.insert(memberships).values({
    userId: u1.id,
    merchantId: tenants.a.merchant.id,
    role: "owner",
  });
  await db
    .update(merchants)
    .set({ plan: "growth" })
    .where(eq(merchants.id, tenants.b.merchant.id));
});

afterAll(async () => {
  await close();
});

describe("adminOverview", () => {
  it("aggregates across all tenants", async () => {
    const data = await adminOverview(db);
    expect(data.merchants).toBe(2);
    expect(data.users).toBeGreaterThanOrEqual(1);
    expect(data.skus).toBeGreaterThan(0);
    expect(data.signups7d).toBeGreaterThanOrEqual(1);
    expect(data.planCounts.free).toBe(1);
    expect(data.planCounts.growth).toBe(1);
  });

  it("recent signups join merchant, plan, and product counts", async () => {
    const data = await adminOverview(db);
    const ownerA = data.recentSignups.find((r) => r.email === "owner-a@example.com");
    expect(ownerA).toBeDefined();
    expect(ownerA!.merchantName).toBe(tenants.a.merchant.name);
    expect(ownerA!.plan).toBe("free");
    expect(ownerA!.products).toBeGreaterThan(0);
  });
});

describe("adminOverview expanded metrics (#117)", () => {
  it("computes active merchants, daily signups, and API traffic", async () => {
    const { recordApiUsage } = await import("@/db/tenant");
    const [key] = await tenants.a.scope.apiKeys.insert([
      { name: "m-key", prefix: "sr_mmmm", keyHash: "hash-m", scopes: ["read"] },
    ]);
    await recordApiUsage(db, tenants.a.merchant.id, key.id, "products");
    await recordApiUsage(db, tenants.a.merchant.id, key.id, "products");
    await tenants.b.scope.feedRuns.insert([{ kind: "sync", status: "succeeded" }]);

    const data = await adminOverview(db);

    // Both demo tenants have seeded/inserted runs within 7d.
    expect(data.activeMerchants7d).toBeGreaterThanOrEqual(1);

    expect(data.dailySignups).toHaveLength(90);
    const today = new Date().toISOString().slice(0, 10);
    const todaySignups = data.dailySignups.find((d) => d.day === today);
    expect(todaySignups!.total).toBeGreaterThanOrEqual(1);
    // Zero-filled and ordered oldest → newest.
    expect(data.dailySignups[0].day < data.dailySignups[89].day).toBe(true);

    expect(data.dailyApiRequests).toHaveLength(30);
    const todayApi = data.dailyApiRequests.find((d) => d.day === today);
    expect(todayApi!.total).toBe(2);
  });
});

describe("admin merchants (#118)", () => {
  it("lists merchants with counts, owner, and filters", async () => {
    const { adminMerchantsList } = await import("./queries");
    const all = await adminMerchantsList(db);
    expect(all.length).toBe(2);
    const a = all.find((m) => m.id === tenants.a.merchant.id)!;
    expect(a.ownerEmail).toBe("demo-tenant-a@useshelfready.com");
    expect(a.products).toBeGreaterThan(0);
    expect(a.sources).toBeGreaterThan(0);

    const growthOnly = await adminMerchantsList(db, { plan: "growth" });
    expect(growthOnly.map((m) => m.id)).toEqual([tenants.b.merchant.id]);

    const byEmail = await adminMerchantsList(db, { q: "demo-tenant-a@" });
    expect(byEmail.map((m) => m.id)).toEqual([tenants.a.merchant.id]);
  });

  it("detail returns members, sources, counts, and null for unknown ids", async () => {
    const { adminMerchantDetail } = await import("./queries");
    const detail = await adminMerchantDetail(db, tenants.a.merchant.id);
    expect(detail).not.toBeNull();
    expect(detail!.members.some((m) => m.email === "owner-a@example.com")).toBe(true);
    expect(detail!.counts.products).toBeGreaterThan(0);
    expect(detail!.sources.length).toBeGreaterThan(0);

    expect(
      await adminMerchantDetail(db, "00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });
});

describe("support inbox (#119)", () => {
  it("lists, counts, and triages contact messages", async () => {
    const { contactMessages } = await import("@/db/schema");
    const {
      adminContactMessages,
      adminCountNewMessages,
      adminSetMessageStatus,
    } = await import("./queries");

    const [msg] = await db
      .insert(contactMessages)
      .values({
        name: "Visitor",
        email: "visitor@example.com",
        topic: "Pricing",
        message: "How does the free plan work?",
      })
      .returning();

    expect(await adminCountNewMessages(db)).toBe(1);
    const list = await adminContactMessages(db, "new");
    expect(list.map((m) => m.id)).toContain(msg.id);

    const replied = await adminSetMessageStatus(db, msg.id, "replied");
    expect(replied!.status).toBe("replied");
    expect(await adminCountNewMessages(db)).toBe(0);
    expect(await adminContactMessages(db, "replied")).toHaveLength(1);

    expect(
      await adminSetMessageStatus(db, "00000000-0000-0000-0000-000000000000", "closed"),
    ).toBeNull();
  });
});
