import type { TestDb } from "./test-db";
import { seedDemo } from "./seed-data";
import { forMerchant } from "./tenant";

/**
 * Two-tenant harness for isolation tests: merchants A and B, each seeded
 * with a source and products. Use `a.scope` / `b.scope` for scoped access
 * and the raw ids to attempt (and prove futile) cross-tenant access.
 */
export async function createTwoTenants(db: TestDb) {
  const a = await seedDemo(db, "-tenant-a");
  const b = await seedDemo(db, "-tenant-b");
  return {
    a: { ...a, scope: forMerchant(db, a.merchant.id) },
    b: { ...b, scope: forMerchant(db, b.merchant.id) },
  };
}
