import { count, countDistinct, desc, eq, gte, inArray, sum } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import {
  apiUsage,
  feedRuns,
  memberships,
  merchants,
  products,
  users,
} from "@/db/schema";

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
  /** Distinct merchants with a sync/render/audit run in the last 7 days. */
  activeMerchants7d: number;
  /** Zero-filled daily signup counts, oldest first (90 days). */
  dailySignups: { day: string; total: number }[];
  /** Zero-filled daily API request totals across all tenants (30 days). */
  dailyApiRequests: { day: string; total: number }[];
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

function zeroFilledDays(days: number): { day: string; total: number }[] {
  return Array.from({ length: days }, (_, i) => ({
    day: new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    total: 0,
  }));
}

export async function adminOverview(db: AnyDb): Promise<AdminOverview> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [
    [{ merchantCount }],
    [{ userCount }],
    [{ skuCount }],
    [{ signups7d }],
    [{ signups30d }],
    [{ activeMerchants7d }],
    signupDates,
    usageByDay,
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
      .select({ activeMerchants7d: countDistinct(feedRuns.merchantId) })
      .from(feedRuns)
      .where(gte(feedRuns.startedAt, sevenDaysAgo)),
    db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(gte(users.createdAt, ninetyDaysAgo)),
    db
      .select({ day: apiUsage.day, total: sum(apiUsage.count) })
      .from(apiUsage)
      .groupBy(apiUsage.day),
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

  const dailySignups = zeroFilledDays(90);
  const signupIndex = new Map(dailySignups.map((d, i) => [d.day, i]));
  for (const { createdAt } of signupDates) {
    const idx = signupIndex.get(createdAt.toISOString().slice(0, 10));
    if (idx != null) dailySignups[idx].total++;
  }

  const dailyApiRequests = zeroFilledDays(30);
  const usageIndex = new Map(dailyApiRequests.map((d, i) => [d.day, i]));
  for (const row of usageByDay) {
    const idx = usageIndex.get(row.day);
    if (idx != null) dailyApiRequests[idx].total += Number(row.total ?? 0);
  }

  return {
    merchants: merchantCount,
    users: userCount,
    skus: skuCount,
    signups7d,
    signups30d,
    activeMerchants7d,
    dailySignups,
    dailyApiRequests,
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
