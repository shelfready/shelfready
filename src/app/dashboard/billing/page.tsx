import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { requireMerchant } from "@/lib/require-merchant";
import { PLANS, isPlanId, type PlanId } from "@/billing/plans";
import { Badge, Card, PageHeader } from "@/components/ui";
import { ManageBillingButton, UpgradeButton } from "./actions";

const ORDER: PlanId[] = ["free", "starter", "growth", "scale"];

const FEATURES: Record<PlanId, string[]> = {
  free: ["Hosted AI-surface feeds", "Agent-readiness audit", "CSV & WooCommerce sync"],
  starter: ["Everything in Free", "Freshness monitoring & drift alerts", "Priority feed refresh"],
  growth: ["Everything in Starter", "Claude catalog enrichment", "All connectors"],
  scale: ["Everything in Growth", "Highest SKU cap", "Priority support"],
};

export default async function BillingPage() {
  const { merchant } = await requireMerchant();
  const [m] = await getDb()
    .select({ plan: merchants.plan })
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const currentPlan: PlanId = isPlanId(m.plan) ? m.plan : "free";

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Billing"
        description="Flat monthly tiers by catalog size. Prices are pre-release placeholders — payments run in Stripe test mode."
        action={currentPlan !== "free" ? <ManageBillingButton /> : undefined}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === currentPlan;
          return (
            <Card
              key={planId}
              className={isCurrent ? "border-primary ring-1 ring-primary" : ""}
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-base font-semibold">{plan.label}</h2>
                {isCurrent && <Badge tone="success">current</Badge>}
              </div>
              <p className="text-2xl font-semibold">
                {plan.priceUsdMonthly === 0 ? "Free" : `$${plan.priceUsdMonthly}`}
                {plan.priceUsdMonthly > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                )}
              </p>
              <p className="mb-3 text-sm text-muted-foreground">
                up to {plan.maxSkus.toLocaleString("en-US")} SKUs
              </p>
              <ul className="mb-4 grid gap-1 text-sm text-muted-foreground">
                {FEATURES[planId].map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              {!isCurrent && planId !== "free" && <UpgradeButton plan={planId} />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
