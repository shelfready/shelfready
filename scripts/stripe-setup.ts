import { getStripe } from "../src/billing/stripe";
import { PLANS, type PlanId } from "../src/billing/plans";

// tsx runs these as CJS (no "type": "module") — no top-level await.
async function main() {
  // Idempotent test-mode provisioning of one product + monthly price per
  // paid tier, tagged with metadata.shelfready_plan for lookup.
  const stripe = getStripe();

  for (const [id, plan] of Object.entries(PLANS)) {
    if (plan.priceUsdMonthly === 0) continue;
    const planId = id as PlanId;

    const existing = await stripe.prices.search({
      query: `active:'true' AND metadata['shelfready_plan']:'${planId}'`,
    });
    if (existing.data.length > 0) {
      console.log(`price for ${planId} exists (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: `ShelfReady ${plan.label}`,
      metadata: { shelfready_plan: planId },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceUsdMonthly * 100,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { shelfready_plan: planId },
    });
    console.log(`created ${planId}: ${product.id} / ${price.id}`);
  }
}

void main();
