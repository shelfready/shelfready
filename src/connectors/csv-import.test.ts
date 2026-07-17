import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "@/db/test-db";
import { createTwoTenants } from "@/db/test-tenants";
import { parseUpload, rowToCanonical, type CsvMapping } from "./csv";
import { runSyncItems } from "./sync";
import "./csv"; // register the csv connector

let db: TestDb;
let close: () => Promise<void>;
let tenants: Awaited<ReturnType<typeof createTwoTenants>>;

const mapping: CsvMapping = {
  columns: { externalId: "sku", title: "title", price: "price", gtin: "gtin" },
  defaultCurrency: "EUR",
};

const csv = (rows: string) =>
  Buffer.from(`sku,title,price,gtin\n${rows}`);

async function importCsv(merchantId: string, sourceId: string, buf: Buffer) {
  const { rows } = await parseUpload("upload.csv", buf);
  return runSyncItems(
    db,
    merchantId,
    sourceId,
    rows.map((r) => rowToCanonical(r, mapping)),
  );
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  tenants = await createTwoTenants(db);
});

afterAll(async () => {
  await close();
});

describe("csv import path", () => {
  it("imports parsed rows through the pipeline", async () => {
    const [source] = await tenants.a.scope.sources.insert([
      { type: "csv", name: "upload.csv", config: { mapping } },
    ]);
    const { stats } = await importCsv(
      tenants.a.merchant.id,
      source.id,
      csv("C-1,First,9.99,4006381333931\nC-2,Second,19.99,\nC-BAD,Bad,x,123"),
    );
    expect(stats).toMatchObject({ seen: 3, upserted: 2, rejected: 1 });

    const products = (await tenants.a.scope.products.list()).filter(
      (p) => p.sourceId === source.id,
    );
    expect(products.map((p) => p.externalId).sort()).toEqual(["C-1", "C-2"]);
    expect(products.find((p) => p.externalId === "C-1")?.priceMinor).toBe(999);
  });

  it("re-upload updates rather than duplicates", async () => {
    const [source] = await tenants.a.scope.sources.insert([
      { type: "csv", name: "re.csv", config: { mapping } },
    ]);
    await importCsv(tenants.a.merchant.id, source.id, csv("R-1,Original,5,"));
    await importCsv(tenants.a.merchant.id, source.id, csv("R-1,Renamed,6,"));

    const rows = (await tenants.a.scope.products.list()).filter(
      (p) => p.sourceId === source.id,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Renamed");
    expect(rows[0].priceMinor).toBe(600);
  });

  it("csv connector refuses pull-style sync", async () => {
    const [source] = await tenants.a.scope.sources.insert([
      { type: "csv", name: "pull.csv", config: { mapping } },
    ]);
    const { runSync } = await import("./sync");
    await expect(
      runSync(db, tenants.a.merchant.id, source.id),
    ).rejects.toThrow(/push-only/);
  });

  it("tenant isolation: A's import is invisible to B", async () => {
    const bBefore = await tenants.b.scope.products.list();
    const [source] = await tenants.a.scope.sources.insert([
      { type: "csv", name: "iso.csv", config: { mapping } },
    ]);
    await importCsv(tenants.a.merchant.id, source.id, csv("ISO-1,Iso,1,"));
    expect(await tenants.b.scope.products.list()).toEqual(bBefore);
    await expect(
      importCsv(tenants.b.merchant.id, source.id, csv("EVIL-1,Evil,1,")),
    ).rejects.toThrow(/not found/);
  });
});
