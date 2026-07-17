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
    hostedFeeds: plan !== "free",
    enrichment: plan === "growth" || plan === "scale",
    freshnessMonitoring: plan !== "free",
  };
}
