import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";

/** Topbar global search: products by title / SKU / brand. */
export async function GET(req: Request) {
  const { merchant } = await requireMerchant();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const rows = await forMerchant(getDb(), merchant.merchantId).products.search(q);
  return NextResponse.json({
    results: rows.map((p) => ({
      id: p.id,
      sku: p.externalId,
      title: p.title,
      brand: p.brand,
      availability: p.availability,
      priceMinor: p.priceMinor,
      currency: p.currency,
    })),
  });
}
