import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { apiError, requireApiKey, withApiErrors } from "@/lib/api-auth";
import { createWebhookRecord, WEBHOOK_EVENTS } from "@/webhooks/deliver";

/** GET /api/v1/webhooks — registered endpoints (never the secret). */
async function _GET(req: Request) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;

  const hooks = await forMerchant(getDb(), auth.merchantId).webhooks.list();
  return NextResponse.json({
    data: hooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      enabled: w.enabled,
      created_at: w.createdAt,
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

/** POST /api/v1/webhooks — register; the signing secret appears once. */
async function _POST(req: Request) {
  const auth = await requireApiKey(req, "write");
  if (auth instanceof NextResponse) return auth;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(
      400,
      `body must be {url: https://…, events: [${WEBHOOK_EVENTS.join(" | ")}]}`,
    );
  }
  const { secret, values } = createWebhookRecord(
    parsed.data.url,
    parsed.data.events,
  );
  const [row] = await forMerchant(getDb(), auth.merchantId).webhooks.insert([
    values,
  ]);
  return NextResponse.json({
    data: { id: row.id, url: row.url, events: row.events, secret },
  });
}

const deleteSchema = z.object({ id: z.string().uuid() });

/** DELETE /api/v1/webhooks — remove an endpoint. */
async function _DELETE(req: Request) {
  const auth = await requireApiKey(req, "write");
  if (auth instanceof NextResponse) return auth;

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, "body must be {id: <uuid>}");

  const removed = await forMerchant(getDb(), auth.merchantId).webhooks.remove(
    parsed.data.id,
  );
  if (removed === 0) return apiError(404, "webhook not found");
  return NextResponse.json({ data: { ok: true } });
}

export const GET = withApiErrors(_GET);
export const POST = withApiErrors(_POST);
export const DELETE = withApiErrors(_DELETE);
