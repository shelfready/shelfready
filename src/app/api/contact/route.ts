import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema";

/** Contact form → stored in the DB first (admin inbox, issue #119),
 * then emailed. Rate limited per IP; a failed send never loses the
 * message. */

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  topic: z.string().max(100).optional(),
  message: z.string().min(1).max(5000),
});

const WINDOW_MS = 60_000;
const LIMIT = 3;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= LIMIT) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many messages — try again in a minute." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill in every field." }, { status: 400 });
  }
  const { name, email, topic, message } = parsed.data;

  // Store first — once this row exists the message cannot be lost.
  await getDb()
    .insert(contactMessages)
    .values({ name, email, topic: topic ?? null, message });

  // Email is best-effort on top of the stored copy.
  const { emailConfigured, sendEmail } = await import("@/lib/email");
  if (emailConfigured()) {
    await sendEmail({
      to: process.env.CONTACT_EMAIL ?? "support@useshelfready.com",
      subject: `[contact] ${topic ?? "General"} — ${name}`,
      text: `From: ${name} <${email}>\nTopic: ${topic ?? "General"}\n\n${message}`,
      replyTo: email,
    }).catch((e) => console.error("[contact] email forward failed:", e));
  } else {
    console.log(`[contact] (email not configured) stored message from ${name} <${email}>`);
  }
  return NextResponse.json({ ok: true });
}
