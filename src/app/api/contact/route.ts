import { NextResponse } from "next/server";
import { z } from "zod";

/** Contact form → email. Rate limited per IP; honeypot-free but capped. */

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

  const { emailConfigured, sendEmail } = await import("@/lib/email");
  if (!emailConfigured()) {
    console.log(`[contact] (email not configured) from ${name} <${email}>: ${message}`);
    return NextResponse.json({ ok: true });
  }

  try {
    await sendEmail({
      to: process.env.CONTACT_EMAIL ?? "support@useshelfready.com",
      subject: `[contact] ${topic ?? "General"} — ${name}`,
      text: `From: ${name} <${email}>\nTopic: ${topic ?? "General"}\n\n${message}`,
      replyTo: email,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not send right now — email support@useshelfready.com directly." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
