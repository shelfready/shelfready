"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { merchantsFor } from "@/lib/tenancy";
import { ACTIVE_MERCHANT_COOKIE } from "@/lib/require-merchant";

/** Topbar store switcher: only merchants the user belongs to are settable. */
export async function switchMerchant(merchantId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const all = await merchantsFor(getDb(), session.user.id);
  if (!all.some((m) => m.merchantId === merchantId)) return;
  (await cookies()).set(ACTIVE_MERCHANT_COOKIE, merchantId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
