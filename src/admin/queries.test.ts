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
