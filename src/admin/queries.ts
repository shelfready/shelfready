import { count, desc, eq, gte, inArray } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { memberships, merchants, products, users } from "@/db/schema";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * Admin-panel queries (issue #116). This module is the sanctioned
 * exception to the forMerchant rule (like findMerchantByApiKeyHash):
 * cross-tenant READS for the admin area only, always behind
 * requireAdmin, never imported by merchant-facing code. Keep every
 * admin query in this file so the exception stays auditable.
 */

export interface AdminOverview {
  merchants: number;
  users: number;
  skus: number;
  signups7d: number;
  signups30d: number;
  planCounts: Record<string, number>;
  recentSignups: {
    userId: string;
    email: string;
    name: string | null;
    createdAt: Date;
    merchantName: string | null;
    plan: string | null;
    products: number;
  }[];
}

export async function adminOverview(db: AnyDb): Promise<AdminOverview> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    [{ merchantCount }],
    [{ userCount }],
    [{ skuCount }],
    [{ signups7d }],
    [{ signups30d }],
    planRows,
    signupRows,
  ] = await Promise.all([
    db.select({ merchantCount: count() }).from(merchants),
    db.select({ userCount: count() }).from(users),
    db.select({ skuCount: count() }).from(products),
    db
      .select({ signups7d: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo)),
    db
      .select({ signups30d: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo)),
    db
      .select({ plan: merchants.plan, n: count() })
      .from(merchants)
      .groupBy(merchants.plan),
    db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        merchantName: merchants.name,
        plan: merchants.plan,
        merchantId: merchants.id,
      })
      .from(users)
      .leftJoin(memberships, eq(memberships.userId, users.id))
      .leftJoin(merchants, eq(merchants.id, memberships.merchantId))
      .orderBy(desc(users.createdAt))
      .limit(15),
  ]);

  // Product counts for the recent-signup merchants in one query.
  const merchantIds = signupRows
    .map((r) => r.merchantId)
    .filter((id): id is string => Boolean(id));
  const productCounts =
    merchantIds.length > 0
      ? await db
          .select({ merchantId: products.merchantId, n: count() })
          .from(products)
          .where(inArray(products.merchantId, merchantIds))
          .groupBy(products.merchantId)
      : [];
  const productsByMerchant = new Map(productCounts.map((r) => [r.merchantId, r.n]));

  return {
    merchants: merchantCount,
    users: userCount,
    skus: skuCount,
    signups7d,
    signups30d,
    planCounts: Object.fromEntries(planRows.map((r) => [r.plan, r.n])),
    recentSignups: signupRows.map((r) => ({
      userId: r.userId,
      email: r.email,
      name: r.name,
      createdAt: r.createdAt,
      merchantName: r.merchantName,
      plan: r.plan,
      products: r.merchantId ? (productsByMerchant.get(r.merchantId) ?? 0) : 0,
    })),
  };
}
