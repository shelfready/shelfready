import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { memberships, merchants, users } from "@/db/schema";
import { activeMerchantFor, provisionNewUser } from "./tenancy";

let db: TestDb;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

async function makeUser(email: string) {
  const [u] = await db.insert(users).values({ email }).returning();
  return u;
}

describe("provisionNewUser", () => {
  it("creates a personal merchant with an owner membership", async () => {
    const u = await makeUser("ana@example.com");
    const merchantId = await provisionNewUser(db, u.id);

    const [m] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, merchantId));
    expect(m.slug).toBe("ana");

    const ms = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, u.id));
    expect(ms).toHaveLength(1);
    expect(ms[0].role).toBe("owner");
    expect(ms[0].merchantId).toBe(merchantId);
  });

  it("is idempotent for an already-provisioned user", async () => {
    const u = await makeUser("bob@example.com");
    const first = await provisionNewUser(db, u.id);
    const second = await provisionNewUser(db, u.id);
    expect(second).toBe(first);
    const ms = await db
      .select()
      .from(memberships)
      .where(eq(memberships.userId, u.id));
    expect(ms).toHaveLength(1);
  });

  it("resolves slug collisions with a numeric suffix", async () => {
    const u1 = await makeUser("chris@one.example");
    const u2 = await makeUser("chris@two.example");
    const m1 = await provisionNewUser(db, u1.id);
    const m2 = await provisionNewUser(db, u2.id);
    const rows = await db.select().from(merchants);
    const slugs = rows
      .filter((m) => m.id === m1 || m.id === m2)
      .map((m) => m.slug)
      .sort();
    expect(slugs).toEqual(["chris", "chris-2"]);
  });

  it("slugifies awkward email local parts", async () => {
    const u = await makeUser("Dörte.Müller+shop@example.com");
    const merchantId = await provisionNewUser(db, u.id);
    const [m] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, merchantId));
    expect(m.slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("activeMerchantFor", () => {
  it("returns the user's merchant with role and slug", async () => {
    const u = await makeUser("dora@example.com");
    const merchantId = await provisionNewUser(db, u.id);
    const active = await activeMerchantFor(db, u.id);
    expect(active).toMatchObject({ merchantId, role: "owner", slug: "dora" });
  });

  it("returns null for a user with no memberships", async () => {
    const u = await makeUser("nobody@example.com");
    expect(await activeMerchantFor(db, u.id)).toBeNull();
  });
});
