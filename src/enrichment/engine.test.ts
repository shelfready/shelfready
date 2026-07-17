import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { enrichmentProposals, products } from "@/db/schema";
import {
  applyApproved,
  isCandidate,
  reviewProposal,
  runEnrichment,
  setEnrichmentClient,
} from "./engine";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

/** Mock Anthropic client: proposes a description for every product sent. */
function mockClient(onCall?: (payload: string) => void) {
  return {
    messages: {
      parse: vi.fn(async ({ messages }: { messages: { content: string }[] }) => {
        const content = String(messages[0].content);
        onCall?.(content);
        const items = JSON.parse(content.slice(content.indexOf("\n") + 1)) as {
          externalId: string;
        }[];
        return {
          parsed_output: {
            products: items.map((i) => ({
              externalId: i.externalId,
              proposals: [
                {
                  field: "description",
                  proposedValue: `Enriched description for ${i.externalId} with plenty of grounded, factual detail.`,
                  rationale: "Description was missing or thin.",
                },
              ],
            })),
          },
        };
      }),
    },
  } as unknown as Anthropic;
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
});

afterAll(async () => {
  setEnrichmentClient(undefined);
  await close();
});

describe("isCandidate", () => {
  it("selects thin/missing content, skips complete products", async () => {
    const rows = await tenants.a.scope.products.list();
    const complete = rows.find((p) => p.externalId === "SKU-1001")!; // full seed product
    const thin = rows.find((p) => p.externalId === "SKU-1002")!; // thin description, no brand
    expect(isCandidate(complete)).toBe(false);
    expect(isCandidate(thin)).toBe(true);
  });
});

describe("runEnrichment", () => {
  it("proposes for candidates, persists pending proposals", async () => {
    setEnrichmentClient(mockClient());
    const stats = await runEnrichment(db, tenants.a.merchant.id);
    expect(stats.candidates).toBeGreaterThan(0);
    expect(stats.proposed).toBeGreaterThan(0);

    const proposals = await db
      .select()
      .from(enrichmentProposals)
      .where(eq(enrichmentProposals.merchantId, tenants.a.merchant.id));
    expect(proposals.length).toBe(stats.proposed);
    expect(proposals.every((p) => p.status === "pending")).toBe(true);
    expect(proposals[0].valueHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("caches: re-running against unchanged content proposes nothing new", async () => {
    setEnrichmentClient(mockClient());
    const rerun = await runEnrichment(db, tenants.a.merchant.id);
    expect(rerun.proposed).toBe(0);
    expect(rerun.skippedCached).toBeGreaterThan(0);
  });

  it("batches at most 8 products per call", async () => {
    const calls: number[] = [];
    setEnrichmentClient(
      mockClient((content) => {
        const items = JSON.parse(content.slice(content.indexOf("\n") + 1)) as unknown[];
        calls.push(items.length);
      }),
    );
    await runEnrichment(db, tenants.b.merchant.id);
    expect(calls.length).toBeGreaterThan(0);
    expect(Math.max(...calls)).toBeLessThanOrEqual(8);
  });
});

describe("proposal lifecycle", () => {
  it("approve → apply mutates the product and marks applied", async () => {
    const [proposal] = await db
      .select()
      .from(enrichmentProposals)
      .where(eq(enrichmentProposals.merchantId, tenants.a.merchant.id))
      .limit(1);

    expect(await reviewProposal(db, tenants.a.merchant.id, proposal.id, "approved")).toBe(true);
    const { applied } = await applyApproved(db, tenants.a.merchant.id);
    expect(applied).toBe(1);

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, proposal.productId));
    expect(product.description).toBe(proposal.proposedValue);

    const [after] = await db
      .select()
      .from(enrichmentProposals)
      .where(eq(enrichmentProposals.id, proposal.id));
    expect(after.status).toBe("applied");
  });

  it("re-reviewing a non-pending proposal fails", async () => {
    const [appliedProposal] = await db
      .select()
      .from(enrichmentProposals)
      .where(eq(enrichmentProposals.status, "applied"))
      .limit(1);
    expect(
      await reviewProposal(db, tenants.a.merchant.id, appliedProposal.id, "rejected"),
    ).toBe(false);
  });

  it("tenant isolation: B cannot review or apply A's proposals", async () => {
    const [aPending] = await db
      .select()
      .from(enrichmentProposals)
      .where(eq(enrichmentProposals.merchantId, tenants.a.merchant.id));
    if (aPending) {
      expect(
        await reviewProposal(db, tenants.b.merchant.id, aPending.id, "approved"),
      ).toBe(false);
    }
    // applyApproved for B touches only B's rows
    const aProducts = await tenants.a.scope.products.list();
    await applyApproved(db, tenants.b.merchant.id);
    expect(await tenants.a.scope.products.list()).toEqual(aProducts);
  });
});
