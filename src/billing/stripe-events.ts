import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import type { getDb } from "@/db";
import type { TestDb } from "@/db/test-db";
import { merchants, stripeEvents } from "@/db/schema";
import { entitlementsFor, isPlanId, type PlanId } from "./plans";

type AnyDb = ReturnType<typeof getDb> | TestDb;

/**
 * Applies a Stripe webhook event to our state. Pure of HTTP concerns so
 * tests drive it directly; the route verifies signatures and hands the
 * parsed event here. Idempotent: processed event ids are recorded and
 * replays are no-ops.
 */
export async function processStripeEvent(db: AnyDb, event: Stripe.Event) {
  const existing = await db
    .select()
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id));
  if (existing.length > 0) return { applied: false as const, reason: "replay" };

  let applied = false;
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const merchantId = session.client_reference_id;
      const plan = session.metadata?.plan;
      if (merchantId && plan && isPlanId(plan)) {
        await setPlan(db, merchantId, plan, session.customer as string | null);
        applied = true;
      }
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const plan = sub.metadata?.plan;
      const customerId = sub.customer as string;
      if (plan && isPlanId(plan)) {
        const active = sub.status === "active" || sub.status === "trialing";
        await setPlanByCustomer(db, customerId, active ? plan : "free");
        applied = true;
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await setPlanByCustomer(db, sub.customer as string, "free");
      applied = true;
      break;
    }
    default:
      break;
  }

  await db.insert(stripeEvents).values({ id: event.id, type: event.type });
  return { applied };
}

async function setPlan(
  db: AnyDb,
  merchantId: string,
  plan: PlanId,
  stripeCustomerId: string | null,
) {
  await db
    .update(merchants)
    .set({
      plan,
      entitlements: entitlementsFor(plan),
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    })
    .where(eq(merchants.id, merchantId));
}

async function setPlanByCustomer(
  db: AnyDb,
  stripeCustomerId: string,
  plan: PlanId,
) {
  await db
    .update(merchants)
    .set({ plan, entitlements: entitlementsFor(plan) })
    .where(eq(merchants.stripeCustomerId, stripeCustomerId));
}
