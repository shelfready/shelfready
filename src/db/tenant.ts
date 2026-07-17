import { and, eq } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { getDb } from "./index";
import type { TestDb } from "./test-db";
import {
  auditFindings,
  feedRuns,
  products,
  sources,
  variants,
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
