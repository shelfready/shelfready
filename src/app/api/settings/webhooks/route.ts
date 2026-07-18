import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { createWebhookRecord, WEBHOOK_EVENTS } from "@/webhooks/deliver";

/** GET — this merchant's webhooks with their recent deliveries (never
 * the signing secret). */
export async function GET() {
  const { merchant } = await requireMerchant();
  const scope = forMerchant(getDb(), merchant.merchantId);
  const [hooks, deliveries] = await Promise.all([
    scope.webhooks.list(),
    scope.webhookDeliveries.list(),
  ]);
  const recentByHook = new Map<string, typeof deliveries>();
  for (const d of deliveries.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )) {
    const list = recentByHook.get(d.webhookId) ?? [];
    if (list.length < 10) list.push(d);
    recentByHook.set(d.webhookId, list);
  }
  return NextResponse.json({
    webhooks: hooks
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        enabled: w.enabled,
        createdAt: w.createdAt,
        deliveries: (recentByHook.get(w.id) ?? []).map((d) => ({
          id: d.id,
          event: d.event,
          status: d.status,
          attempts: d.attempts,
          lastError: d.lastError,
          nextAttemptAt: d.nextAttemptAt,
          createdAt: d.createdAt,
        })),
      })),
  });
}

const createSchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => u.startsWith("https://") || u.startsWith("http://localhost"), {
      message: "must be HTTPS",
    }),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

/** POST — register a webhook. The signing secret appears here only. */
export async function POST(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "enter an HTTPS URL and pick at least one event" },
      { status: 400 },
    );
  }
  const { secret, values } = createWebhookRecord(
    parsed.data.url,
    parsed.data.events,
  );
  const [row] = await forMerchant(getDb(), merchant.merchantId).webhooks.insert([
    values,
  ]);
  return NextResponse.json({ id: row.id, secret });
}

const deleteSchema = z.object({ id: z.string().uuid() });

/** DELETE — remove a webhook (and, via cascade, its deliveries). */
export async function DELETE(req: Request) {
  const { merchant } = await requireMerchant();
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const removed = await forMerchant(getDb(), merchant.merchantId).webhooks.remove(
    parsed.data.id,
  );
  if (removed === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
