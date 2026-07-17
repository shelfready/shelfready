import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { apiError, requireApiKey } from "@/lib/api-auth";

/** GET /api/v1/products/{id} — one product with variants. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  const scope = forMerchant(getDb(), auth.merchantId);
  const product = await scope.products.getById(id).catch(() => undefined);
  if (!product) return apiError(404, "product not found");
  const variants = (await scope.variants.list()).filter(
    (v) => v.productId === product.id,
  );
  return NextResponse.json({ data: { ...product, variants } });
}
