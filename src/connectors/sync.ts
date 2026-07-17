import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { forMerchant } from "@/db/tenant";
import { decryptJson, encryptJson } from "@/lib/crypto";
import { validateProduct, type ValidationIssue } from "@/model/product";
import { getConnector } from "./registry";

type AnyDb = ReturnType<typeof getDb> | TestDb;

const REJECTION_DETAIL_CAP = 100;

export interface SyncStats {
  seen: number;
  upserted: number;
  rejected: number;
  warnings: number;
  rejections: { externalId: string | null; issues: ValidationIssue[] }[];
}

/** The only writer of sources.credentials_enc — always ciphertext. */
export async function setSourceCredentials(
  db: AnyDb,
  merchantId: string,
  sourceId: string,
  credentials: unknown,
) {
  return forMerchant(db, merchantId).sources.update(sourceId, {
    credentialsEnc: encryptJson(credentials),
  });
}

export async function getSourceCredentials<T = unknown>(
  db: AnyDb,
  merchantId: string,
  sourceId: string,
): Promise<T | null> {
  const source = await forMerchant(db, merchantId).sources.getById(sourceId);
  if (!source?.credentialsEnc) return null;
  return decryptJson<T>(source.credentialsEnc);
}

/**
 * Pull-style sync: resolve the source's connector, stream its items
 * through the pipeline. Push-style sources (CSV upload) call
 * runSyncItems directly with parsed rows instead.
 */
export async function runSync(
  db: AnyDb,
  merchantId: string,
  sourceId: string,
): Promise<{ runId: string; stats: SyncStats }> {
  const scope = forMerchant(db, merchantId);
  const source = await scope.sources.getById(sourceId);
  if (!source) throw new Error(`source ${sourceId} not found for merchant`);

  const connector = getConnector(source.type);
  const credentials = source.credentialsEnc
    ? decryptJson(source.credentialsEnc)
    : null;

  return runSyncItems(
    db,
    merchantId,
    sourceId,
    connector.fetchProducts({ config: source.config, credentials }),
  );
}

/**
 * The pipeline: items → canonical validation → scoped upsert, recorded
 * as a feed_runs row. Rejected items never touch the catalog; their
 * issues are captured (capped) in the run's stats.
 */
export async function runSyncItems(
  db: AnyDb,
  merchantId: string,
  sourceId: string,
  items: AsyncIterable<unknown> | Iterable<unknown>,
): Promise<{ runId: string; stats: SyncStats }> {
  const scope = forMerchant(db, merchantId);
  const source = await scope.sources.getById(sourceId);
  if (!source) throw new Error(`source ${sourceId} not found for merchant`);

  const [run] = await scope.feedRuns.insert([
    { sourceId, kind: "sync", status: "running" },
  ]);

  const stats: SyncStats = {
    seen: 0,
    upserted: 0,
    rejected: 0,
    warnings: 0,
    rejections: [],
  };

  try {
    for await (const raw of items) {
      stats.seen++;
      const { product, issues } = validateProduct(raw);
      stats.warnings += issues.filter((i) => i.severity === "warning").length;

      if (!product) {
        stats.rejected++;
        if (stats.rejections.length < REJECTION_DETAIL_CAP) {
          const externalId =
            typeof raw === "object" && raw !== null && "externalId" in raw
              ? String((raw as { externalId: unknown }).externalId)
              : null;
          stats.rejections.push({ externalId, issues });
        }
        continue;
      }

      const row = await scope.products.upsertByExternalId(sourceId, {
        externalId: product.externalId,
        title: product.title ?? null,
        description: product.description ?? null,
        brand: product.brand ?? null,
        url: product.url ?? null,
        imageUrl: product.imageUrl ?? null,
        priceMinor: product.priceMinor ?? null,
        currency: product.currency ?? null,
        availability: product.availability,
        gtin: product.gtin ?? null,
        mpn: product.mpn ?? null,
        attributes: product.attributes,
      });

      for (const v of product.variants) {
        await scope.variants.upsertByExternalId(row.id, {
          externalId: v.externalId,
          sku: v.sku ?? null,
          title: v.title ?? null,
          priceMinor: v.priceMinor ?? null,
          currency: v.currency ?? null,
          availability: v.availability,
          gtin: v.gtin ?? null,
          mpn: v.mpn ?? null,
          color: v.color ?? null,
          size: v.size ?? null,
          sizeSystem: v.sizeSystem ?? null,
          gender: v.gender ?? null,
          attributes: v.attributes,
        });
      }
      stats.upserted++;
    }

    await scope.feedRuns.update(run.id, {
      status: "succeeded",
      stats,
      finishedAt: new Date(),
    });
    await scope.sources.update(sourceId, { lastSyncAt: new Date() });
    return { runId: run.id, stats };
  } catch (error) {
    await scope.feedRuns.update(run.id, {
      status: "failed",
      stats,
      error: (error as Error).message,
      finishedAt: new Date(),
    });
    throw error;
  }
}
