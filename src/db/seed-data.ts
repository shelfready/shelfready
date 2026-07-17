import type { TestDb } from "./test-db";
import type { getDb } from "./index";
import {
  memberships,
  merchants,
  products,
  sources,
  users,
  variants,
} from "./schema";

type AnyDb = TestDb | ReturnType<typeof getDb>;

/**
 * Demo catalog: one merchant, one CSV source, a handful of products with
 * deliberately mixed data quality (missing brand, invalid GTIN checksum,
 * thin description) so audit/enrichment work has something real to chew on.
 */
export async function seedDemo(db: AnyDb, suffix = "") {
  const [merchant] = await db
    .insert(merchants)
    .values({
      name: `Demo Outdoor Supply${suffix}`,
      slug: `demo-outdoor-supply${suffix}`,
    })
    .returning();

  const [user] = await db
    .insert(users)
    .values({ email: `demo${suffix}@useshelfready.com`, name: "Demo Owner" })
    .returning();

  await db
    .insert(memberships)
    .values({ userId: user.id, merchantId: merchant.id, role: "owner" });

  const [source] = await db
    .insert(sources)
    .values({
      merchantId: merchant.id,
      type: "csv",
      name: "Initial CSV upload",
    })
    .returning();

  const inserted = await db
    .insert(products)
    .values([
      {
        merchantId: merchant.id,
        sourceId: source.id,
        externalId: "SKU-1001",
        title: "Alpine 2-Person Tent",
        description:
          "Lightweight two-person tent with aluminium poles, taped seams and a 3000mm waterproof rating. Packs down to 40cm.",
        brand: "Demo Outdoor",
        url: "https://demo-outdoor.example.com/products/alpine-tent",
        imageUrl: "https://demo-outdoor.example.com/img/alpine-tent.jpg",
        priceMinor: 24900,
        currency: "EUR",
        availability: "in_stock" as const,
        gtin: "4006381333931", // valid checksum
      },
      {
        merchantId: merchant.id,
        sourceId: source.id,
        externalId: "SKU-1002",
        title: "Trail Headlamp",
        description: "Bright headlamp.", // deliberately thin
        brand: null, // deliberately missing
        url: "https://demo-outdoor.example.com/products/trail-headlamp",
        imageUrl: "https://demo-outdoor.example.com/img/headlamp.jpg",
        priceMinor: 3499,
        currency: "EUR",
        availability: "in_stock" as const,
        gtin: "4006381333932", // invalid checksum
      },
      {
        merchantId: merchant.id,
        sourceId: source.id,
        externalId: "SKU-1003",
        title: "Merino Hiking Sock",
        description:
          "Cushioned merino-blend hiking sock with arch support and a seamless toe. Machine washable.",
        brand: "Demo Outdoor",
        url: "https://demo-outdoor.example.com/products/merino-sock",
        imageUrl: "https://demo-outdoor.example.com/img/sock.jpg",
        priceMinor: 1599,
        currency: "EUR",
        availability: "out_of_stock" as const,
        gtin: null, // deliberately missing
      },
    ])
    .returning();

  const sockProduct = inserted.find((p) => p.externalId === "SKU-1003")!;
  await db.insert(variants).values([
    {
      merchantId: merchant.id,
      productId: sockProduct.id,
      externalId: "SKU-1003-M",
      sku: "SOCK-M",
      title: "Merino Hiking Sock — M",
      priceMinor: 1599,
      currency: "EUR",
      availability: "out_of_stock" as const,
      size: "M",
      sizeSystem: "EU",
    },
    {
      merchantId: merchant.id,
      productId: sockProduct.id,
      externalId: "SKU-1003-L",
      sku: "SOCK-L",
      title: "Merino Hiking Sock — L",
      priceMinor: 1599,
      currency: "EUR",
      availability: "in_stock" as const,
      size: "L",
      sizeSystem: "EU",
    },
  ]);

  return { merchant, user, source, products: inserted };
}
