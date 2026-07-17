import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { generateApiKey } from "@/lib/api-auth";

/** GET — list this merchant's API keys (never the key itself). */
export async function GET() {
  const { merchant } = await requireMerchant();
  const keys = await forMerchant(getDb(), merchant.merchantId).apiKeys.list();
  return NextResponse.json({
    keys: keys
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        revokedAt: k.revokedAt,
        createdAt: k.createdAt,
      })),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write"])).min(1).default(["read", "write"]),
});

/** POST — create a key. The plaintext key appears in this response only. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const { key, hash, prefix } = generateApiKey();
  const [row] = await forMerchant(getDb(), merchant.merchantId).apiKeys.insert([
    { name: parsed.data.name, prefix, keyHash: hash, scopes: parsed.data.scopes },
  ]);
  return NextResponse.json({ id: row.id, key, prefix });
}

const revokeSchema = z.object({ id: z.string().uuid() });

/** DELETE — revoke a key (kept for the audit trail, never deleted). */
export async function DELETE(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = revokeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const updated = await forMerchant(getDb(), merchant.merchantId).apiKeys.update(
    parsed.data.id,
    { revokedAt: new Date() },
  );
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
