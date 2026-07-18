import { describe, expect, it } from "vitest";
import type { CatalogEntry } from "@/feeds/expand";
import { auditEntry } from "./rules";
import { RULE_CATALOG, RULE_META_BY_CODE } from "./rule-catalog";

const base: CatalogEntry = {
  itemId: "SKU-1",
  groupId: "SKU-1",
  title: null,
  description: null,
  brand: null,
  url: null,
  imageUrl: null,
  priceMinor: null,
  currency: null,
  availability: "unknown",
  gtin: null,
  mpn: null,
  color: null,
  size: null,
  sizeSystem: null,
  gender: null,
};

describe("RULE_CATALOG", () => {
  it("covers exactly the codes the audit engine can emit per SKU", () => {
    // Two crafted entries jointly trigger every per-SKU rule.
    const allMissing = auditEntry(base);
    const allInvalid = auditEntry({
      ...base,
      gtin: "123",
      title: "x".repeat(200),
      description: "thin",
      url: "http://insecure.example/p",
      imageUrl: "https://img.example/p.jpg",
      brand: "Acme",
      priceMinor: 1999,
      currency: "USD",
      availability: "in_stock",
    });
    const emitted = new Set(
      [...allMissing, ...allInvalid].map((f) => f.code),
    );
    const catalog = new Set(RULE_CATALOG.map((r) => r.code));
    expect([...emitted].sort()).toEqual([...catalog].sort());
  });

  it("mirrors severity and weight of the engine's findings", () => {
    for (const f of auditEntry(base)) {
      const meta = RULE_META_BY_CODE.get(f.code);
      expect(meta, f.code).toBeDefined();
      expect(meta!.severity).toBe(f.severity);
      expect(meta!.weight).toBe(f.weight);
    }
  });
});
