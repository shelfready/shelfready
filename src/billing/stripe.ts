import Stripe from "stripe";

let _stripe: Stripe | undefined;

/**
 * Test-mode Stripe client (WORKFLOW guardrail: test keys until Kalin's
 * explicit go). Lazy so builds/tests need no key.
 */
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    // Refuse live keys outright until launch is explicitly approved.
    throw new Error("live Stripe keys are not allowed yet (test mode only)");
  }
  return (_stripe ??= new Stripe(key));
}
