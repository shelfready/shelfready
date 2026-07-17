import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { enrichmentProposals, merchants, sources } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { valueHashOf } from "@/enrichment/engine";
import { renderFeedsSafely, getOrCreateFeedToken } from "@/feeds/render";
import { runAuditSafely } from "@/audit/run";

type AnyDb = ReturnType<typeof getDb> | TestDb;

export const DEMO_SLUG = "demo";

const CATALOG: {
  externalId: string;
  title: string | null;
  description: string | null;
  brand: string | null;
  priceMinor: number | null;
  availability: "in_stock" | "out_of_stock" | "backorder";
  gtin: string | null;
}[] = [
  { externalId: "ALP-TENT-2P", title: "Alpine Ridge 2-Person Tent", description: "Freestanding two-person tent with aluminium poles, taped seams, 3000 mm hydrostatic head and a 2.1 kg trail weight. Packs to 42 cm.", brand: "Alpine Ridge", priceMinor: 24900, availability: "in_stock", gtin: "4006381333931" },
  { externalId: "ALP-BAG-15", title: "Summit 15° Down Sleeping Bag", description: "700-fill duck down mummy bag rated to 15°F with a draft collar and YKK zips.", brand: "Alpine Ridge", priceMinor: 18900, availability: "in_stock", gtin: "96385074" },
  { externalId: "ALP-STOVE", title: "Micro Canister Stove", description: "Compact stove.", brand: null, priceMinor: 4499, availability: "in_stock", gtin: "4006381333932" },
  { externalId: "ALP-LAMP", title: "Trail Headlamp 400", description: null, brand: "LumenWorks", priceMinor: 3499, availability: "in_stock", gtin: null },
  { externalId: "ALP-SOCK-M", title: "Merino Cushion Hiking Sock — Medium", description: "Cushioned merino-blend hiking sock with arch support and a seamless toe. Machine washable, guaranteed for life.", brand: "Alpine Ridge", priceMinor: 1599, availability: "out_of_stock", gtin: "036000291452" },
  { externalId: "ALP-POLE", title: "Carbon Trekking Poles (Pair) with Extended Cork Grips and Interchangeable All-Terrain Baskets for Four-Season Mountain Use Including Winter Snowshoeing Expeditions and Desert Canyon Crossings", description: "Three-section carbon poles, 17 cm packed adjustment range, flick locks.", brand: "Alpine Ridge", priceMinor: 8900, availability: "in_stock", gtin: "00012345600012" },
  { externalId: "ALP-FILTER", title: "Squeeze Water Filter", description: "Hollow-fibre squeeze filter rated to 0.1 micron; threads onto standard bottles.", brand: "ClearFlow", priceMinor: 3299, availability: "in_stock", gtin: null },
  { externalId: "ALP-JACKET", title: "Stratus Rain Shell", description: "2.5-layer waterproof shell, 12 kPa breathability, pit zips, 280 g.", brand: "Alpine Ridge", priceMinor: 15900, availability: "backorder", gtin: "4006381333931" },
  { externalId: "ALP-PAD", title: "UltraLight Sleeping Pad", description: null, brand: null, priceMinor: 9900, availability: "in_stock", gtin: null },
  { externalId: "ALP-CUP", title: "Titanium Mug 450ml", description: "Single-wall titanium mug with measurement gradations and a lid.", brand: "Alpine Ridge", priceMinor: 2799, availability: "in_stock", gtin: "96385074" },
];

/** Idempotent demo tenant with realistic warts; feeds + audit fresh. */
export async function getOrCreateDemoMerchant(db: AnyDb): Promise<string> {
  const [existing] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.slug, DEMO_SLUG));
  if (existing) return existing.id;

  const [merchant] = await db
    .insert(merchants)
    .values({
      name: "Alpine Outdoor Supply (Demo)",
      slug: DEMO_SLUG,
      settings: {
        sellerName: "Alpine Outdoor Supply",
        sellerUrl: "https://alpine-outdoor.example.com",
        storeCountry: "DE",
      },
    })
    .returning();
  const scope = forMerchant(db, merchant.id);
  const [source] = await scope.sources.insert([
    { type: "csv", name: "catalog-2026-07.csv", config: {} },
  ]);
  await db.update(sources).set({ lastSyncAt: new Date() }).where(eq(sources.id, source.id));

  for (const item of CATALOG) {
    await scope.products.upsertByExternalId(source.id, {
      externalId: item.externalId,
      title: item.title,
      description: item.description,
      brand: item.brand,
      url: `https://alpine-outdoor.example.com/products/${item.externalId.toLowerCase()}`,
      imageUrl: `https://alpine-outdoor.example.com/img/${item.externalId.toLowerCase()}.jpg`,
      priceMinor: item.priceMinor,
      currency: "EUR",
      availability: item.availability,
      gtin: item.gtin,
      mpn: null,
      attributes: {},
    });
  }

  // A couple of enrichment proposals so the demo shows the review flow.
  const products = await scope.products.list();
  const stove = products.find((p) => p.externalId === "ALP-STOVE");
  const lamp = products.find((p) => p.externalId === "ALP-LAMP");
  if (stove) {
    await db.insert(enrichmentProposals).values({
      merchantId: merchant.id,
      productId: stove.id,
      field: "description",
      currentValue: stove.description,
      proposedValue:
        "Ultra-compact canister stove weighing 73 g with a fold-out pot support, piezo-free lighting and 2.8 kW output — boils half a litre in under three minutes.",
      rationale: "Current description is 14 characters — too thin for agents to rank.",
      valueHash: valueHashOf(stove),
    });
  }
  if (lamp) {
    await db.insert(enrichmentProposals).values({
      merchantId: merchant.id,
      productId: lamp.id,
      field: "description",
      currentValue: null,
      proposedValue:
        "400-lumen rechargeable headlamp with red night-vision mode, IPX6 water resistance and a 40-hour low-beam runtime.",
      rationale: "Description missing — required for feed eligibility.",
      valueHash: valueHashOf(lamp),
    });
  }

  await getOrCreateFeedToken(db, merchant.id);
  await renderFeedsSafely(db, merchant.id);
  await runAuditSafely(db, merchant.id);
  return merchant.id;
}
