import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { setSourceCredentials } from "@/connectors/sync";
import { testMagentoConnection } from "@/connectors/magento";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  baseUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://"), { message: "must be HTTPS" }),
  accessToken: z.string().min(1),
});

/** Create a Magento source: connection-test first, token encrypted. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid body" },
      { status: 400 },
    );
  }
  const { name, baseUrl, accessToken } = parsed.data;

  try {
    await testMagentoConnection({ baseUrl }, { accessToken });
  } catch (e) {
    return NextResponse.json(
      { error: `connection test failed: ${(e as Error).message}` },
      { status: 422 },
    );
  }

  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [source] = await scope.sources.insert([
    { type: "magento", name, config: { baseUrl } },
  ]);
  await setSourceCredentials(db, merchant.merchantId, source.id, {
    accessToken,
  });

  return NextResponse.json({ sourceId: source.id });
}
