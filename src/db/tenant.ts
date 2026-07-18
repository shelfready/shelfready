import { and, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { getDb } from "./index";
import type { TestDb } from "./test-db";
import {
  apiKeys,
  apiUsage,
  auditFindings,
  feedRuns,
  products,
  sources,
  variants,
  webhookDeliveries,
  webhooks,
} from "./schema";

type AnyDb = ReturnType<typeof getDb> | TestDb;

type TenantTable = PgTable & {
  id: PgColumn;
  merchantId: PgColumn;
};

/**
 * Scoped accessors for one tenant-owned table. Every read is filtered by
 * merchant_id; every write forces it. Row ids from another tenant simply
 * don't exist through this view (reads return nothing, writes touch 0
 * rows) — no "forbidden" oracle to probe.
 */
function scoped<T extends TenantTable>(
  db: AnyDb,
  merchantId: string,
  table: T,
) {
  type Insert = Omit<T["$inferInsert"], "merchantId">;
  type Row = T["$inferSelect"];
  return {
    list: async (): Promise<Row[]> =>
      db.select().from(table as PgTable).where(eq(table.merchantId, merchantId)),
    getById: async (id: string): Promise<Row | undefined> => {
      const rows = await db
        .select()
        .from(table as PgTable)
        .where(and(eq(table.id, id), eq(table.merchantId, merchantId)));
      return rows[0] as Row | undefined;
    },
    insert: async (values: Insert[]): Promise<Row[]> =>
      db
        .insert(table)
        // Force the scope's merchantId — callers cannot write another
        // tenant's rows even if they smuggle a merchantId key in.
        .values(values.map((v) => ({ ...v, merchantId })) as T["$inferInsert"][])
        .returning() as Promise<Row[]>,
    update: async (
      id: string,
      set: Partial<Insert>,
    ): Promise<Row | undefined> => {
      const rows = (await db
        .update(table)
        .set({ ...set, merchantId } as Partial<T["$inferInsert"]>)
        .where(and(eq(table.id, id), eq(table.merchantId, merchantId)))
        .returning()) as Row[];
      return rows[0];
    },
    remove: async (id: string): Promise<number> => {
      const rows = (await db
        .delete(table)
        .where(and(eq(table.id, id), eq(table.merchantId, merchantId)))
        .returning()) as Row[];
      return rows.length;
    },
  };
}

/**
 * The only sanctioned way to touch tenant-owned tables (see CLAUDE.md).
 * Merchant-scoped queries that outgrow these accessors belong in this
 * module, next to the scope they must respect.
 */
export function forMerchant(db: AnyDb, merchantId: string) {
  return {
    merchantId,
    products: {
      ...scoped(db, merchantId, products),
      /** Sync upsert keyed on (source_id, external_id). */
      upsertByExternalId: async (
        sourceId: string,
        values: Omit<
          typeof products.$inferInsert,
          "merchantId" | "sourceId" | "id"
        >,
      ) => {
        const [row] = await db
          .insert(products)
          .values({ ...values, merchantId, sourceId })
          .onConflictDoUpdate({
            target: [products.sourceId, products.externalId],
            set: { ...values, merchantId, updatedAt: new Date() },
          })
          .returning();
        return row;
      },
      /** Topbar global search: title/SKU/brand substring match. */
      search: async (query: string, limit = 8) => {
        const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
        return db
          .select()
          .from(products)
          .where(
            and(
              eq(products.merchantId, merchantId),
              or(
                ilike(products.title, pattern),
                ilike(products.externalId, pattern),
                ilike(products.brand, pattern),
              ),
            ),
          )
          .limit(limit);
      },
    },
    variants: {
      ...scoped(db, merchantId, variants),
      /** Sync upsert keyed on (product_id, external_id). */
      upsertByExternalId: async (
        productId: string,
        values: Omit<
          typeof variants.$inferInsert,
          "merchantId" | "productId" | "id"
        >,
      ) => {
        const [row] = await db
          .insert(variants)
          .values({ ...values, merchantId, productId })
          .onConflictDoUpdate({
            target: [variants.productId, variants.externalId],
            set: { ...values, merchantId, updatedAt: new Date() },
          })
          .returning();
        return row;
      },
    },
    sources: scoped(db, merchantId, sources),
    apiKeys: scoped(db, merchantId, apiKeys),
    apiUsage: {
      ...scoped(db, merchantId, apiUsage),
      /** Usage rows for the trailing `days` window, oldest day first. */
      window: async (days: number) => {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        return db
          .select()
          .from(apiUsage)
          .where(
            and(eq(apiUsage.merchantId, merchantId), gte(apiUsage.day, since)),
          )
          .orderBy(apiUsage.day);
      },
    },
    webhooks: scoped(db, merchantId, webhooks),
    webhookDeliveries: scoped(db, merchantId, webhookDeliveries),
    feedRuns: scoped(db, merchantId, feedRuns),
    auditFindings: {
      ...scoped(db, merchantId, auditFindings),
      /** Audit snapshot semantics: replace all findings atomically. */
      replaceAll: async (
        values: Omit<typeof auditFindings.$inferInsert, "merchantId" | "id">[],
      ) => {
        await db
          .delete(auditFindings)
          .where(eq(auditFindings.merchantId, merchantId));
        if (values.length > 0) {
          await db
            .insert(auditFindings)
            .values(values.map((v) => ({ ...v, merchantId })));
        }
      },
    },
  };
}

export type MerchantScope = ReturnType<typeof forMerchant>;

/**
 * The public API's auth entry point — the only sanctioned cross-tenant
 * read on api_keys: we don't know the merchant until the key resolves.
 * Returns nothing for revoked keys; touches last_used_at on hit.
 */
export async function findMerchantByApiKeyHash(
  db: AnyDb,
  keyHash: string,
): Promise<
  | { merchantId: string; keyId: string; scopes: string[] }
  | undefined
> {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash));
  if (!row || row.revokedAt) return undefined;
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));
  return {
    merchantId: row.merchantId,
    keyId: row.id,
    scopes: (row.scopes as string[]) ?? [],
  };
}

/**
 * Increment today's usage counter for a key (issue #108). Called
 * fire-and-forget from requireApiKey after successful auth — merchantId
 * comes from the resolved key, so the write is tenant-scoped by
 * construction.
 */
export async function recordApiUsage(
  db: AnyDb,
  merchantId: string,
  apiKeyId: string,
  endpoint: string,
  day = new Date().toISOString().slice(0, 10),
): Promise<void> {
  await db
    .insert(apiUsage)
    .values({ merchantId, apiKeyId, day, endpoint, count: 1 })
    .onConflictDoUpdate({
      target: [apiUsage.apiKeyId, apiUsage.day, apiUsage.endpoint],
      set: { count: sql`${apiUsage.count} + 1` },
    });
}

/** Retention: drop usage rows older than `days` (cron, all tenants). */
export async function pruneApiUsage(db: AnyDb, days = 90): Promise<void> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  await db.delete(apiUsage).where(lt(apiUsage.day, cutoff));
}
