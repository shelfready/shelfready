import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { enrichmentProposals, products } from "@/db/schema";
import { forMerchant } from "@/db/tenant";

type AnyDb = ReturnType<typeof getDb> | TestDb;
type ProductRow = typeof products.$inferSelect;

const BATCH_SIZE = 8;
const MODEL = () => process.env.ENRICHMENT_MODEL ?? "claude-opus-4-8";

/** Structured output schema — proposals arrive validated, never scraped. */
const enrichmentResultSchema = z.object({
  products: z.array(
    z.object({
      externalId: z.string(),
      proposals: z.array(
        z.object({
          field: z.enum(["description", "brand", "title"]),
          proposedValue: z.string(),
          rationale: z.string(),
        }),
      ),
    }),
  ),
});

let _client: Anthropic | undefined;
function getClient(): Anthropic {
  return (_client ??= new Anthropic());
}
/** Test seam. */
export function setEnrichmentClient(client: Anthropic | undefined) {
  _client = client;
}

/** Which products need enrichment, and why (mirrors the audit rules). */
export function isCandidate(p: ProductRow): boolean {
  return (
    !p.description ||
    p.description.length < 80 ||
    !p.brand ||
    !p.title ||
    p.title.length > 150
  );
}

export function valueHashOf(p: ProductRow): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: p.title,
        description: p.description,
        brand: p.brand,
      }),
    )
    .digest("hex");
}

const SYSTEM = `You enrich e-commerce product catalogs so AI shopping agents can discover and recommend the products. For each product you receive, propose improvements ONLY for fields that are missing or weak:
- description: write a factual, plain-text description (150-600 chars) grounded strictly in the provided data. Never invent specifications, materials, or measurements that are not present or clearly implied.
- brand: propose only when the brand is unambiguously derivable from the title or other fields; otherwise omit.
- title: propose only when the current title exceeds 150 characters (shorten faithfully) or is unusably vague.
Each proposal needs a one-sentence rationale. If a product needs no changes, return it with an empty proposals array. Plain text only — no markdown, no HTML.`;

/**
 * Runs one enrichment pass for a merchant: selects candidates, skips
 * ones already proposed against unchanged content, batches them through
 * Claude with a strict output schema, persists pending proposals.
 */
export async function runEnrichment(
  db: AnyDb,
  merchantId: string,
  options: { limit?: number } = {},
): Promise<{ candidates: number; proposed: number; skippedCached: number }> {
  const scope = forMerchant(db, merchantId);
  const allProducts = await scope.products.list();
  const candidates = allProducts.filter(isCandidate).slice(0, options.limit ?? 40);

  // Cache: skip products with an existing non-rejected proposal computed
  // from the same current values.
  const hashes = new Map(candidates.map((p) => [p.id, valueHashOf(p)]));
  const existing = candidates.length
    ? await db
        .select()
        .from(enrichmentProposals)
        .where(
          and(
            eq(enrichmentProposals.merchantId, merchantId),
            inArray(
              enrichmentProposals.productId,
              candidates.map((p) => p.id),
            ),
          ),
        )
    : [];
  const cachedProductIds = new Set(
    existing
      .filter(
        (e) => e.status !== "rejected" && e.valueHash === hashes.get(e.productId),
      )
      .map((e) => e.productId),
  );
  const toEnrich = candidates.filter((p) => !cachedProductIds.has(p.id));

  let proposed = 0;
  const client = getClient();

  for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
    const batch = toEnrich.slice(i, i + BATCH_SIZE);
    const payload = batch.map((p) => ({
      externalId: p.externalId,
      title: p.title,
      description: p.description,
      brand: p.brand,
      url: p.url,
      attributes: p.attributes,
    }));

    const response = await client.messages.parse({
      model: MODEL(),
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { format: zodOutputFormat(enrichmentResultSchema) },
      messages: [
        {
          role: "user",
          content: `Enrich these products:\n${JSON.stringify(payload, null, 2)}`,
        },
      ],
    });
    const parsed = response.parsed_output;
    if (!parsed) continue;

    const byExternal = new Map(batch.map((p) => [p.externalId, p]));
    for (const item of parsed.products) {
      const product = byExternal.get(item.externalId);
      if (!product) continue;
      for (const proposal of item.proposals) {
        const currentValue =
          proposal.field === "description"
            ? product.description
            : proposal.field === "brand"
              ? product.brand
              : product.title;
        if (proposal.proposedValue.trim() === (currentValue ?? "").trim()) continue;
        await db.insert(enrichmentProposals).values({
          merchantId,
          productId: product.id,
          field: proposal.field,
          currentValue,
          proposedValue: proposal.proposedValue.trim(),
          rationale: proposal.rationale,
          valueHash: hashes.get(product.id)!,
        });
        proposed++;
      }
    }
  }

  return {
    candidates: candidates.length,
    proposed,
    skippedCached: cachedProductIds.size,
  };
}

/** Approve/reject a pending proposal. */
export async function reviewProposal(
  db: AnyDb,
  merchantId: string,
  proposalId: string,
  decision: "approved" | "rejected",
): Promise<boolean> {
  const result = await db
    .update(enrichmentProposals)
    .set({ status: decision, updatedAt: new Date() })
    .where(
      and(
        eq(enrichmentProposals.id, proposalId),
        eq(enrichmentProposals.merchantId, merchantId),
        eq(enrichmentProposals.status, "pending"),
      ),
    )
    .returning();
  return result.length > 0;
}

/**
 * Applies all approved proposals to the catalog (scoped writes), then
 * feeds + audit refresh downstream.
 */
export async function applyApproved(
  db: AnyDb,
  merchantId: string,
): Promise<{ applied: number }> {
  const scope = forMerchant(db, merchantId);
  const approved = await db
    .select()
    .from(enrichmentProposals)
    .where(
      and(
        eq(enrichmentProposals.merchantId, merchantId),
        eq(enrichmentProposals.status, "approved"),
      ),
    );

  let applied = 0;
  for (const proposal of approved) {
    const updated = await scope.products.update(proposal.productId, {
      [proposal.field]: proposal.proposedValue,
    });
    if (!updated) continue;
    await db
      .update(enrichmentProposals)
      .set({ status: "applied", updatedAt: new Date() })
      .where(eq(enrichmentProposals.id, proposal.id));
    applied++;
  }

  if (applied > 0) {
    const { renderFeedsSafely } = await import("@/feeds/render");
    await renderFeedsSafely(db, merchantId);
    const { runAuditSafely } = await import("@/audit/run");
    await runAuditSafely(db, merchantId);
  }
  return { applied };
}
