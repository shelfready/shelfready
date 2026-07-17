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
    // Should not happen (createUser provisions); fail loud rather than
    // render a tenant-less dashboard.
    throw new Error("signed-in user has no merchant membership");
  }
  return { session, merchant: session.activeMerchant };
}
