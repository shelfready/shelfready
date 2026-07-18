import { and, count, countDistinct, desc, eq, gte, inArray, sum } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import {
  apiUsage,
  feedRuns,
  memberships,
  merchants,
  products,
  sources,
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

export interface AdminMerchantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: Date;
  ownerEmail: string | null;
  products: number;
  sources: number;
  lastSyncAt: Date | null;
  lastAuditScore: number | null;
}

/** Merchants list with search (name/slug/owner email) and plan filter. */
export async function adminMerchantsList(
  db: AnyDb,
  filter: { q?: string; plan?: string } = {},
): Promise<AdminMerchantRow[]> {
  const [merchantRows, ownerRows, productCounts, sourceRows, auditRuns] =
    await Promise.all([
      db.select().from(merchants).orderBy(desc(merchants.createdAt)),
      db
        .select({
          merchantId: memberships.merchantId,
          email: users.email,
          createdAt: memberships.createdAt,
        })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .orderBy(memberships.createdAt),
      db
        .select({ merchantId: products.merchantId, n: count() })
        .from(products)
        .groupBy(products.merchantId),
      db
        .select({
          merchantId: sources.merchantId,
          lastSyncAt: sources.lastSyncAt,
        })
        .from(sources),
      db
        .select({
          merchantId: feedRuns.merchantId,
          stats: feedRuns.stats,
          startedAt: feedRuns.startedAt,
        })
        .from(feedRuns)
        .where(eq(feedRuns.kind, "audit"))
        .orderBy(desc(feedRuns.startedAt)),
    ]);

  const ownerByMerchant = new Map<string, string>();
  for (const o of ownerRows) {
    if (!ownerByMerchant.has(o.merchantId)) ownerByMerchant.set(o.merchantId, o.email);
  }
  const productsByMerchant = new Map(productCounts.map((r) => [r.merchantId, r.n]));
  const sourcesByMerchant = new Map<string, { n: number; lastSyncAt: Date | null }>();
  for (const s of sourceRows) {
    const agg = sourcesByMerchant.get(s.merchantId) ?? { n: 0, lastSyncAt: null };
    agg.n++;
    if (s.lastSyncAt && (!agg.lastSyncAt || s.lastSyncAt > agg.lastSyncAt)) {
      agg.lastSyncAt = s.lastSyncAt;
    }
    sourcesByMerchant.set(s.merchantId, agg);
  }
  const scoreByMerchant = new Map<string, number>();
  for (const r of auditRuns) {
    const score = (r.stats as { catalogScore?: number } | null)?.catalogScore;
    if (score != null && !scoreByMerchant.has(r.merchantId)) {
      scoreByMerchant.set(r.merchantId, score);
    }
  }

  const q = filter.q?.trim().toLowerCase();
  return merchantRows
    .map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      plan: m.plan,
      createdAt: m.createdAt,
      ownerEmail: ownerByMerchant.get(m.id) ?? null,
      products: productsByMerchant.get(m.id) ?? 0,
      sources: sourcesByMerchant.get(m.id)?.n ?? 0,
      lastSyncAt: sourcesByMerchant.get(m.id)?.lastSyncAt ?? null,
      lastAuditScore: scoreByMerchant.get(m.id) ?? null,
    }))
    .filter((m) => !filter.plan || m.plan === filter.plan)
    .filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        (m.ownerEmail ?? "").toLowerCase().includes(q),
    );
}

export interface AdminMerchantDetail {
  merchant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    stripeCustomerId: string | null;
    createdAt: Date;
    settings: unknown;
  };
  members: { email: string; name: string | null; role: string }[];
  sources: {
    id: string;
    name: string;
    type: string;
    lastSyncAt: Date | null;
  }[];
  counts: { products: number; variants: number };
  lastAudit: { score: number | null; grade: string | null; findings: number | null; at: Date } | null;
  lastRender: { items: number | null; eligible: number | null; at: Date } | null;
  webhooks: { url: string; events: unknown; enabled: boolean; failed30d: number }[];
  apiKeys: {
    name: string;
    prefix: string;
    revoked: boolean;
    lastUsedAt: Date | null;
    requests30d: number;
  }[];
}

/** Everything support needs about one merchant — strictly read-only. */
export async function adminMerchantDetail(
  db: AnyDb,
  merchantId: string,
): Promise<AdminMerchantDetail | null> {
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId));
  if (!merchant) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { variants, webhooks, webhookDeliveries, apiKeys } = await import(
    "@/db/schema"
  );

  const [
    memberRows,
    sourceRows,
    [{ productCount }],
    [{ variantCount }],
    runs,
    hookRows,
    deliveryRows,
    keyRows,
    usageRows,
  ] = await Promise.all([
    db
      .select({ email: users.email, name: users.name, role: memberships.role })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.merchantId, merchantId)),
    db
      .select({
        id: sources.id,
        name: sources.name,
        type: sources.type,
        lastSyncAt: sources.lastSyncAt,
      })
      .from(sources)
      .where(eq(sources.merchantId, merchantId)),
    db
      .select({ productCount: count() })
      .from(products)
      .where(eq(products.merchantId, merchantId)),
    db
      .select({ variantCount: count() })
      .from(variants)
      .where(eq(variants.merchantId, merchantId)),
    db
      .select()
      .from(feedRuns)
      .where(eq(feedRuns.merchantId, merchantId))
      .orderBy(desc(feedRuns.startedAt))
      .limit(100),
    db.select().from(webhooks).where(eq(webhooks.merchantId, merchantId)),
    db
      .select({
        webhookId: webhookDeliveries.webhookId,
        status: webhookDeliveries.status,
        createdAt: webhookDeliveries.createdAt,
      })
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.merchantId, merchantId)),
    db.select().from(apiKeys).where(eq(apiKeys.merchantId, merchantId)),
    db
      .select({ apiKeyId: apiUsage.apiKeyId, total: sum(apiUsage.count) })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.merchantId, merchantId),
          gte(apiUsage.day, thirtyDaysAgo),
        ),
      )
      .groupBy(apiUsage.apiKeyId),
  ]);

  const lastAuditRun = runs.find((r) => r.kind === "audit" && r.status === "succeeded");
  const auditStats = (lastAuditRun?.stats ?? null) as {
    catalogScore?: number;
    grade?: string;
    findings?: number;
  } | null;
  const lastRenderRun = runs.find((r) => r.kind === "render" && r.status === "succeeded");
  const renderStats = (lastRenderRun?.stats ?? null) as {
    items?: number;
    eligible?: number;
  } | null;

  const monthAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const failedByHook = new Map<string, number>();
  for (const d of deliveryRows) {
    if (
      (d.status === "failed" || d.status === "dead") &&
      d.createdAt.getTime() >= monthAgoMs
    ) {
      failedByHook.set(d.webhookId, (failedByHook.get(d.webhookId) ?? 0) + 1);
    }
  }
  const usageByKey = new Map(
    usageRows.map((r) => [r.apiKeyId, Number(r.total ?? 0)]),
  );

  return {
    merchant: {
      id: merchant.id,
      name: merchant.name,
      slug: merchant.slug,
      plan: merchant.plan,
      stripeCustomerId: merchant.stripeCustomerId,
      createdAt: merchant.createdAt,
      settings: merchant.settings,
    },
    members: memberRows,
    sources: sourceRows,
    counts: { products: productCount, variants: variantCount },
    lastAudit: lastAuditRun
      ? {
          score: auditStats?.catalogScore ?? null,
          grade: auditStats?.grade ?? null,
          findings: auditStats?.findings ?? null,
          at: lastAuditRun.startedAt,
        }
      : null,
    lastRender: lastRenderRun
      ? {
          items: renderStats?.items ?? null,
          eligible: renderStats?.eligible ?? null,
          at: lastRenderRun.startedAt,
        }
      : null,
    webhooks: hookRows.map((w) => ({
      url: w.url,
      events: w.events,
      enabled: w.enabled,
      failed30d: failedByHook.get(w.id) ?? 0,
    })),
    apiKeys: keyRows.map((k) => ({
      name: k.name,
      prefix: k.prefix,
      revoked: Boolean(k.revokedAt),
      lastUsedAt: k.lastUsedAt,
      requests30d: usageByKey.get(k.id) ?? 0,
    })),
  };
}
