import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const ACTIVE_MERCHANT_COOKIE = "sr-merchant";

/**
 * Server-side guard for dashboard pages and route handlers: redirects to
 * sign-in without a session, and returns the session's active merchant.
 * The topbar merchant switcher sets a cookie; it only wins when the user
 * actually has a membership for that merchant.
 */
export async function requireMerchant() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // cookies() throws (synchronously) outside a request scope — e.g. route
  // handlers invoked directly in tests; the switcher override is a no-op there.
  let picked: string | undefined;
  try {
    picked = (await cookies()).get(ACTIVE_MERCHANT_COOKIE)?.value;
  } catch {
    picked = undefined;
  }
  if (
    picked &&
    session.user.id &&
    picked !== session.activeMerchant?.merchantId
  ) {
    const [{ getDb }, { merchantsFor }] = await Promise.all([
      import("@/db"),
      import("@/lib/tenancy"),
    ]);
    const all = await merchantsFor(getDb(), session.user.id);
    const match = all.find((m) => m.merchantId === picked);
    if (match) return { session, merchant: match };
  }

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
