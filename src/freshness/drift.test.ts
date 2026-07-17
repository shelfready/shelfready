import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { like, and, eq } from "drizzle-orm";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { auditFindings, products } from "@/db/schema";
import { compareDrift, extractProductFromPage, runDriftCheck } from "./drift";

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

const pageWith = (ld: object) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>x</body></html>`;

const PRODUCT_LD = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Tent",
  offers: {
    "@type": "Offer",
    price: "249.00",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
  },
};

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
});

afterAll(async () => {
  await close();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("extractProductFromPage", () => {
  it("parses a plain Product node", () => {
    const page = extractProductFromPage(pageWith(PRODUCT_LD));
    expect(page).toEqual({ price: 249, currency: "EUR", availability: "in_stock" });
  });

  it("parses Product inside @graph and offer arrays", () => {
    const page = extractProductFromPage(
      pageWith({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", name: "Shop" },
          { ...PRODUCT_LD, offers: [PRODUCT_LD.offers] },
        ],
      }),
    );
    expect(page?.price).toBe(249);
    expect(page?.availability).toBe("in_stock");
  });

  it("returns null without Product JSON-LD and survives malformed blocks", () => {
    expect(extractProductFromPage("<html><body>nothing</body></html>")).toBeNull();
    const html = `<script type="application/ld+json">{broken</script>${pageWith(PRODUCT_LD)}`;
    expect(extractProductFromPage(html)?.price).toBe(249);
  });
});

describe("compareDrift", () => {
  function row(overrides: object) {
    return {
      priceMinor: 24900,
      currency: "EUR",
      availability: "in_stock",
      ...overrides,
    } as Parameters<typeof compareDrift>[0];
  }

  it("no findings when page matches feed", () => {
    expect(
      compareDrift(row({}), { price: 249, currency: "EUR", availability: "in_stock" }),
    ).toEqual([]);
  });

  it("flags price drift", () => {
    const findings = compareDrift(row({}), {
      price: 199.5,
      currency: "EUR",
      availability: "in_stock",
    });
    expect(findings.map((f) => f.code)).toEqual(["drift_price"]);
  });

  it("flags availability drift", () => {
    const findings = compareDrift(row({}), {
      price: 249,
      currency: "EUR",
      availability: "out_of_stock",
    });
    expect(findings.map((f) => f.code)).toEqual(["drift_availability"]);
  });

  it("unreachable page and missing structured data produce findings", () => {
    expect(compareDrift(row({}), null, true)[0].code).toBe("drift_page_unreachable");
    expect(compareDrift(row({}), null)[0].code).toBe("drift_no_structured_data");
  });
});

describe("runDriftCheck", () => {
  it("snapshots drift findings, records a run, and emails on drift", async () => {
    // Live page shows a different price than the seed product (249.00).
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("smtpfa.st")) {
          return new Response(JSON.stringify({ id: "email_drift" }), { status: 200 });
        }
        return new Response(
          pageWith({
            ...PRODUCT_LD,
            offers: { ...PRODUCT_LD.offers, price: "199.00" },
          }),
          { status: 200 },
        );
      }),
    );
    process.env.SMTPFAST_API_KEY = "sf_test";

    const stats = await runDriftCheck(db, tenants.a.merchant.id);
    expect(stats.checked).toBeGreaterThan(0);
    expect(stats.drifted).toBeGreaterThan(0);

    const rows = await db
      .select()
      .from(auditFindings)
      .where(
        and(
          eq(auditFindings.merchantId, tenants.a.merchant.id),
          like(auditFindings.code, "drift_%"),
        ),
      );
    expect(rows.some((r) => r.code === "drift_price")).toBe(true);

    // digest email attempted
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.some((c) => String(c[0]).includes("smtpfa.st"))).toBe(true);

    const runs = await tenants.a.scope.feedRuns.list();
    expect(runs.some((r) => r.kind === "drift" && r.status === "succeeded")).toBe(true);
    delete process.env.SMTPFAST_API_KEY;
  });

  it("re-running replaces drift findings instead of accumulating", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(pageWith(PRODUCT_LD), { status: 200 })),
    );
    await runDriftCheck(db, tenants.a.merchant.id, { sendAlert: false });
    const first = (
      await db
        .select()
        .from(auditFindings)
        .where(
          and(
            eq(auditFindings.merchantId, tenants.a.merchant.id),
            like(auditFindings.code, "drift_%"),
          ),
        )
    ).length;
    await runDriftCheck(db, tenants.a.merchant.id, { sendAlert: false });
    const second = (
      await db
        .select()
        .from(auditFindings)
        .where(
          and(
            eq(auditFindings.merchantId, tenants.a.merchant.id),
            like(auditFindings.code, "drift_%"),
          ),
        )
    ).length;
    expect(second).toBe(first);
  });

  it("tenant isolation: A's drift check leaves B's findings alone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(pageWith(PRODUCT_LD), { status: 200 })),
    );
    // Give B a drift finding, then run A's check.
    const [bProduct] = await tenants.b.scope.products.list();
    await db.insert(auditFindings).values({
      merchantId: tenants.b.merchant.id,
      productId: bProduct.id,
      code: "drift_price",
      severity: "error",
      field: "price",
      message: "b drift",
    });
    await runDriftCheck(db, tenants.a.merchant.id, { sendAlert: false });
    const bRows = await db
      .select()
      .from(auditFindings)
      .where(
        and(
          eq(auditFindings.merchantId, tenants.b.merchant.id),
          like(auditFindings.code, "drift_%"),
        ),
      );
    expect(bRows).toHaveLength(1);
  });
});
