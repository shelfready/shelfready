import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { merchants } from "@/db/schema";
import { entitlementsFor, isPlanId, type Entitlements } from "./plans";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * A merchant's effective entitlements: the webhook-written snapshot when
 * present, else derived from the plan column (covers rows created
 * before entitlement fields existed).
 */
export async function entitlementsOf(
  db: AnyDb,
  merchantId: string,
): Promise<Entitlements> {
  const [m] = await db
    .select({ plan: merchants.plan, entitlements: merchants.entitlements })
    .from(merchants)
    .where(eq(merchants.id, merchantId));
  const stored = (m?.entitlements ?? {}) as Partial<Entitlements>;
  const fallback = entitlementsFor(isPlanId(m?.plan ?? "") ? (m!.plan as never) : "free");
  return { ...fallback, ...stored };
}
