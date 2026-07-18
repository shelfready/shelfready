import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { memberships, merchants, users } from "@/db/schema";

let db: TestDb;
let close: () => Promise<void>;

vi.mock("@/db", async () => ({
  getDb: () => db,
  schema: await import("@/db/schema"),
}));

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

async function post(body: unknown) {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

async function merchantFor(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const [membership] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, user.id));
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, membership.merchantId));
  return merchant;
}

describe("POST /api/auth/register", () => {
  it("creates a user, provisions a merchant, and seeds sellerUrl from storeUrl", async () => {
    const res = await post({
      email: "mia@example.com",
      password: "correct horse battery",
      name: "Mia",
      storeUrl: "miastore.com",
    });
    expect(res.status).toBe(200);

    const merchant = await merchantFor("mia@example.com");
    expect((merchant.settings as { sellerUrl?: string }).sellerUrl).toBe(
      "https://miastore.com",
    );
  });

  it("upgrades http store URLs to https", async () => {
    await post({
      email: "leo@example.com",
      password: "correct horse battery",
      storeUrl: "http://leostore.com",
    });
    const merchant = await merchantFor("leo@example.com");
    expect((merchant.settings as { sellerUrl?: string }).sellerUrl).toBe(
      "https://leostore.com",
    );
  });

  it("registers fine without a store URL", async () => {
    const res = await post({
      email: "ava@example.com",
      password: "correct horse battery",
    });
    expect(res.status).toBe(200);
    const merchant = await merchantFor("ava@example.com");
    expect((merchant.settings as { sellerUrl?: string }).sellerUrl).toBeUndefined();
  });

  it("rejects an unparseable store URL with a specific error", async () => {
    const res = await post({
      email: "zoe@example.com",
      password: "correct horse battery",
      storeUrl: "not a url at all",
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Enter a valid store URL.");
  });

  it("rejects passwords under 10 characters", async () => {
    const res = await post({ email: "shorty@example.com", password: "short" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 10 characters/);
  });

  it("409s when the email already has a password", async () => {
    const res = await post({
      email: "mia@example.com",
      password: "another long password",
    });
    expect(res.status).toBe(409);
  });

  it("does not clobber an existing sellerUrl for a magic-link user adding a password", async () => {
    // Simulate a magic-link user (no passwordHash) with configured settings.
    const [user] = await db
      .insert(users)
      .values({ email: "magic@example.com" })
      .returning();
    const [merchant] = await db
      .insert(merchants)
      .values({
        name: "Magic",
        slug: "magic",
        settings: { sellerName: "Magic", sellerUrl: "https://existing.example" },
      })
      .returning();
    await db
      .insert(memberships)
      .values({ userId: user.id, merchantId: merchant.id, role: "owner" });

    const res = await post({
      email: "magic@example.com",
      password: "a proper long password",
      storeUrl: "https://newstore.example",
    });
    expect(res.status).toBe(200);

    const [after] = await db
      .select()
      .from(merchants)
      .where(eq(merchants.id, merchant.id));
    expect((after.settings as { sellerUrl?: string }).sellerUrl).toBe(
      "https://existing.example",
    );
  });
});
