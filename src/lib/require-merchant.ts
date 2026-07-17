import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Server-side guard for dashboard pages and route handlers: redirects to
 * sign-in without a session, and returns the session's active merchant.
 */
export async function requireMerchant() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.activeMerchant) {
    // The createUser event provisions a merchant, but Auth.js swallows
    // event errors (seen when a migration lagged) — self-heal here
    // (provisionNewUser is idempotent), and only then fail loud.
    if (session.user.id) {
      const [{ getDb }, { provisionNewUser, activeMerchantFor }] =
        await Promise.all([import("@/db"), import("@/lib/tenancy")]);
      await provisionNewUser(getDb(), session.user.id);
      const merchant = await activeMerchantFor(getDb(), session.user.id);
      if (merchant) return { session, merchant };
    }
    throw new Error("signed-in user has no merchant membership");
  }
  return { session, merchant: session.activeMerchant };
}
