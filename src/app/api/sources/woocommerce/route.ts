import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { setSourceCredentials } from "@/connectors/sync";
import { testWooConnection } from "@/connectors/woocommerce";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "must be HTTPS" }),
  consumerKey: z.string().min(1),
  consumerSecret: z.string().min(1),
});

/** Create a WooCommerce source: connection-test first, creds encrypted. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid body" },
      { status: 400 },
    );
  }
  const { name, baseUrl, consumerKey, consumerSecret } = parsed.data;

  try {
    await testWooConnection({ baseUrl }, { consumerKey, consumerSecret });
  } catch (e) {
    return NextResponse.json(
      { error: `connection test failed: ${(e as Error).message}` },
      { status: 422 },
    );
  }

  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [source] = await scope.sources.insert([
    { type: "woocommerce", name, config: { baseUrl } },
  ]);
  await setSourceCredentials(db, merchant.merchantId, source.id, {
    consumerKey,
    consumerSecret,
  });

  return NextResponse.json({ sourceId: source.id });
}
