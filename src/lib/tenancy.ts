import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { memberships, merchants, users } from "@/db/schema";

type AnyDb = ReturnType<typeof getDb> | TestDb;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "merchant"
  );
}

/**
 * First-sign-in provisioning: every user gets a personal merchant (tenant)
 * with an `owner` membership. Idempotent — a user who already owns a
 * membership is left untouched.
 */
export async function provisionNewUser(db: AnyDb, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new Error(`provisionNewUser: no user ${userId}`);

  const existing = await db
    .select()
    .from(memberships)
    .where(eq(memberships.userId, userId));
  if (existing.length > 0) return existing[0].merchantId;

  const base = slugify(user.email.split("@")[0]);
  // Retry with a numeric suffix on slug collision.
  for (let attempt = 0; ; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    try {
      const [merchant] = await db
        .insert(merchants)
        .values({ name: user.name ?? base, slug })
        .returning();
      await db
        .insert(memberships)
        .values({ userId, merchantId: merchant.id, role: "owner" });
      return merchant.id;
    } catch (e) {
      const cause = (e as Error).cause as Error | undefined;
      const msg = `${(e as Error).message} ${cause?.message ?? ""}`;
      if (attempt < 25 && /duplicate key|unique/i.test(msg)) continue;
      throw e;
    }
  }
}

/** The merchant a user acts as (first membership for now; org switcher later). */
export async function activeMerchantFor(db: AnyDb, userId: string) {
  const rows = await db
    .select({
      merchantId: memberships.merchantId,
      role: memberships.role,
      name: merchants.name,
      slug: merchants.slug,
    })
    .from(memberships)
    .innerJoin(merchants, eq(memberships.merchantId, merchants.id))
    .where(eq(memberships.userId, userId))
    .orderBy(memberships.createdAt);
  return rows[0] ?? null;
}
