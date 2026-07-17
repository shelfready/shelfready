import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { expandCatalog } from "./expand";
import { buildAcpItems, renderAcpCsv, renderAcpJson, type SellerSettings } from "./acp";
import { renderGmcTsv } from "./gmc";
import { buildProductJsonLd } from "./jsonld";
import { getArtifactStore } from "./store";

type AnyDb = ReturnType<typeof getDb> | TestDb;

export const FEED_FILES = [
  { file: "acp.csv", contentType: "text/csv; charset=utf-8" },
  { file: "acp.json", contentType: "application/json" },
  { file: "gmc.tsv", contentType: "text/tab-separated-values; charset=utf-8" },
  { file: "jsonld.json", contentType: "application/json" },
] as const;

export function sellerSettingsOf(m: {
  settings: unknown;
}): SellerSettings {
  const s = (m.settings ?? {}) as Record<string, string | undefined>;
  return {
    sellerName: s.sellerName,
    sellerUrl: s.sellerUrl,
    storeCountry: s.storeCountry,
  };
}

export async function getOrCreateFeedToken(
  db: AnyDb,
  merchantId: string,
): Promise<string> {
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId));
  if (m.feedToken) return m.feedToken;
  const token = randomBytes(16).toString("hex");
  await db
    .update(merchants)
    .set({ feedToken: token })
    .where(eq(merchants.id, merchantId));
  return token;
}

export async function rotateFeedToken(
  db: AnyDb,
  merchantId: string,
): Promise<string> {
  const token = randomBytes(16).toString("hex");
  await db
    .update(merchants)
    .set({ feedToken: token })
    .where(eq(merchants.id, merchantId));
  return token;
}

/**
 * Renders every surface artifact for a merchant and records a `render`
 * feed_run with keys + checksums + eligibility stats (ADR-0004:
 * regenerate on sync, serve from storage).
 */
export async function renderFeeds(db: AnyDb, merchantId: string) {
  const scope = forMerchant(db, merchantId);
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchantId));
  if (!m) throw new Error("merchant not found");

  const [run] = await scope.feedRuns.insert([
    { kind: "render", status: "running" },
  ]);

  try {
    const [productRows, variantRows] = await Promise.all([
      scope.products.list(),
      scope.variants.list(),
    ]);
    const seller = sellerSettingsOf(m);
    const entries = expandCatalog(productRows, variantRows);
    const acpItems = buildAcpItems(productRows, variantRows, seller);

    const bodies: Record<string, string> = {
      "acp.csv": renderAcpCsv(acpItems),
      "acp.json": renderAcpJson(acpItems),
      "gmc.tsv": renderGmcTsv(entries),
      "jsonld.json":
        JSON.stringify(
          entries.map((e) => ({ itemId: e.itemId, jsonLd: buildProductJsonLd(e) })),
          null,
          2,
        ) + "\n",
    };

    const store = getArtifactStore();
    const artifacts: { key: string; sha256: string }[] = [];
    for (const { file, contentType } of FEED_FILES) {
      const key = `${merchantId}/${file}`;
      const body = bodies[file];
      await store.put(key, body, contentType);
      artifacts.push({
        key,
        sha256: createHash("sha256").update(body).digest("hex"),
      });
    }

    const stats = {
      items: acpItems.length,
      eligible: acpItems.filter((i) => i.is_eligible_search).length,
    };
    await scope.feedRuns.update(run.id, {
      status: "succeeded",
      stats,
      artifactKeys: artifacts,
      finishedAt: new Date(),
    });
    return { runId: run.id, stats };
  } catch (error) {
    await scope.feedRuns.update(run.id, {
      status: "failed",
      error: (error as Error).message,
      finishedAt: new Date(),
    });
    throw error;
  }
}

/** Fire-and-record wrapper used after syncs — render failures never
 * fail the sync that triggered them. */
export async function renderFeedsSafely(db: AnyDb, merchantId: string) {
  try {
    return await renderFeeds(db, merchantId);
  } catch {
    return null;
  }
}
