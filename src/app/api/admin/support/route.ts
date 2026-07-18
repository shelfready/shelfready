import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { adminSetMessageStatus } from "@/admin/queries";
import { requireAdminApi } from "@/lib/require-admin";

const bodySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "replied", "closed"]),
});

/** POST — triage a contact message (admin only; 404 for everyone else). */
export async function POST(req: Request) {
  const auth = await requireAdminApi();
  if (auth instanceof NextResponse) return auth;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const row = await adminSetMessageStatus(getDb(), parsed.data.id, parsed.data.status);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: row.status });
}
