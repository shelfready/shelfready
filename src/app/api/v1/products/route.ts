import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireApiKey, withApiErrors } from "@/lib/api-auth";
import { toApiProduct } from "./serialize";

/** GET /api/v1/products — the canonical catalog, paginated, with variants. */
async function _GET(req: Request) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("page_size")) || 50),
  );

  const scope = forMerchant(getDb(), auth.merchantId);
  const [all, variants] = await Promise.all([
    scope.products.list(),
    scope.variants.list(),
  ]);
  const start = (page - 1) * pageSize;
  const slice = all.slice(start, start + pageSize);
  const byProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const list = byProduct.get(v.productId) ?? [];
    list.push(v);
    byProduct.set(v.productId, list);
  }

  return NextResponse.json({
    data: slice.map((p) => toApiProduct(p, byProduct.get(p.id) ?? [])),
    page,
    page_size: pageSize,
    total: all.length,
  });
}

export const GET = withApiErrors(_GET);
