import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Guard for /admin pages: sign-in required, then a 404 for non-admins —
 * the admin area's existence is not advertised (issue #116).
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.isAdmin) notFound();
  return { session };
}

/** Route-handler variant: returns a 404 JSON response for non-admins. */
export async function requireAdminApi() {
  const session = await auth();
  if (!session?.user || !session.isAdmin) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return { session } as const;
}
