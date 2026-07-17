import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { testFeedConnection, type FeedConfig } from "@/connectors/feed";

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  feedUrl: z
    .string()
    .url()
    .refine(
      (u) =>
        u.startsWith("https://") ||
        ["localhost", "127.0.0.1"].includes(new URL(u).hostname),
      { message: "must be HTTPS" },
    ),
  format: z.enum(["auto", "xml", "csv"]).default("auto"),
  defaultCurrency: z
    .string()
    .length(3)
    .transform((c) => c.toUpperCase())
    .optional(),
});

/** Create a feed-URL source: fetch + parse first, so bad URLs fail fast. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid body" },
      { status: 400 },
    );
  }
  const { name, ...config } = parsed.data;

  let itemCount: number;
  try {
    ({ itemCount } = await testFeedConnection(config as FeedConfig));
  } catch (e) {
    return NextResponse.json(
      { error: `feed test failed: ${(e as Error).message}` },
      { status: 422 },
    );
  }

  const scope = forMerchant(getDb(), merchant.merchantId);
  const [source] = await scope.sources.insert([{ type: "feed", name, config }]);

  return NextResponse.json({ sourceId: source.id, itemCount });
}
