import type { ReactNode } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { merchantsFor } from "@/lib/tenancy";
import { PLANS, isPlanId } from "@/billing/plans";
import { signOut } from "@/auth";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { MobileTabBar } from "@/components/dashboard/mobile-tab-bar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { session, merchant } = await requireMerchant();
  const db = getDb();
  const [[merchantRow], productRows, allMerchants] = await Promise.all([
    db.select().from(merchants).where(eq(merchants.id, merchant.merchantId)),
    forMerchant(db, merchant.merchantId).products.list(),
    session.user?.id ? merchantsFor(db, session.user.id) : Promise.resolve([]),
  ]);
  const plan = PLANS[isPlanId(merchantRow?.plan ?? "") ? (merchantRow!.plan as keyof typeof PLANS) : "free"];

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <DashboardSidebar
        quota={{
          planLabel: plan.label,
          used: productRows.length,
          max: plan.maxSkus,
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          merchant={{ merchantId: merchant.merchantId, name: merchant.name }}
          merchants={allMerchants.map((m) => ({
            merchantId: m.merchantId,
            name: m.name,
          }))}
          user={{
            name: session.user?.name ?? session.user?.email ?? "Account",
            email: session.user?.email ?? "",
            isAdmin: session.isAdmin,
          }}
          signOutAction={signOutAction}
        />
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}
