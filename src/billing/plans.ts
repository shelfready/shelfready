/**
 * Flat tiers by SKU count (ADR-0007). Prices are placeholders until M6
 * finalizes pricing; SKU caps gate ingest/feed size via entitlements.
 */
export const PLANS = {
  free: { label: "Free", maxSkus: 25, priceUsdMonthly: 0 },
  starter: { label: "Starter", maxSkus: 500, priceUsdMonthly: 29 },
  growth: { label: "Growth", maxSkus: 5_000, priceUsdMonthly: 79 },
  scale: { label: "Scale", maxSkus: 50_000, priceUsdMonthly: 199 },
} as const;

export type PlanId = keyof typeof PLANS;

export function isPlanId(value: string): value is PlanId {
  return value in PLANS;
}

export interface Entitlements {
  maxSkus: number;
  hostedFeeds: boolean;
  enrichment: boolean;
  freshnessMonitoring: boolean;
}

export function entitlementsFor(plan: PlanId): Entitlements {
  return {
    maxSkus: PLANS[plan].maxSkus,
    // Free includes hosted feeds for its tiny cap — that's the trial hook
    // (decision recorded on issue #22); enrichment + monitoring are paid.
    hostedFeeds: true,
    enrichment: plan === "growth" || plan === "scale",
    freshnessMonitoring: plan !== "free",
  };
}

/** Effective SKU cap for a merchant row: Stripe-webhook-set entitlements
 * win; otherwise the plan's default (free if the plan string is unknown). */
export function maxSkusFor(m: { plan: string; entitlements: unknown }): number {
  const fromEntitlements = (m.entitlements as Partial<Entitlements>)?.maxSkus;
  if (typeof fromEntitlements === "number") return fromEntitlements;
  return PLANS[isPlanId(m.plan) ? m.plan : "free"].maxSkus;
}
