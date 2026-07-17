import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { isIsoCountry } from "@/model/product";
import { renderFeedsSafely, rotateFeedToken } from "@/feeds/render";

const bodySchema = z.object({
  sellerName: z.string().min(1).max(100),
  sellerUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "must be HTTPS" }),
  storeCountry: z
    .string()
    .length(2)
    .transform((c) => c.toUpperCase())
    .refine(isIsoCountry, { message: "not an ISO-3166 alpha-2 country" }),
});

/** Seller-level feed settings (ADR-0009); saving re-renders feeds. */
export async function PUT(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid settings" },
      { status: 400 },
    );
  }
  const db = getDb();
  await db
    .update(merchants)
    .set({ settings: parsed.data })
    .where(eq(merchants.id, merchant.merchantId));
  await renderFeedsSafely(db, merchant.merchantId);
  return NextResponse.json({ ok: true });
}

/** Rotate the public feed token (invalidates existing feed URLs). */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const { action } = (await req.json()) as { action?: string };
  if (action !== "rotate-feed-token") {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const token = await rotateFeedToken(getDb(), merchant.merchantId);
  return NextResponse.json({ token });
}
