import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { hashPassword, passwordPolicyError } from "@/lib/password";

const RESET_NS = "reset:";
const TTL_MS = 60 * 60 * 1000;

/** Request a password-reset email. Always 200 (no account oracle). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const request = z
    .object({ email: z.string().email().transform((e) => e.toLowerCase().trim()) })
    .safeParse(body);
  const confirm = z
    .object({ token: z.string().min(16), email: z.string().email(), password: z.string() })
    .safeParse(body);

  const db = getDb();

  if (confirm.success) {
    const { token, password } = confirm.data;
    const email = confirm.data.email.toLowerCase().trim();
    const policyError = passwordPolicyError(password);
    if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

    const [row] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, `${RESET_NS}${email}`),
          eq(verificationTokens.token, token),
          gt(verificationTokens.expires, new Date()),
        ),
      );
    if (!row) {
      return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
    }
    // Single use.
    await db
      .delete(verificationTokens)
      .where(and(eq(verificationTokens.identifier, row.identifier), eq(verificationTokens.token, row.token)));
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.email, email));
    return NextResponse.json({ ok: true });
  }

  if (request.success) {
    const email = request.data.email;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      const token = randomBytes(32).toString("hex");
      await db.insert(verificationTokens).values({
        identifier: `${RESET_NS}${email}`,
        token,
        expires: new Date(Date.now() + TTL_MS),
      });
      const base = process.env.AUTH_URL ?? new URL(req.url).origin;
      const url = `${base}/reset?token=${token}&email=${encodeURIComponent(email)}`;
      const { emailConfigured, sendEmail } = await import("@/lib/email");
      if (emailConfigured()) {
        await sendEmail({
          to: email,
          subject: "Reset your ShelfReady password",
          text: `Reset your password:\n\n${url}\n\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
        }).catch(() => undefined);
      } else if (process.env.NODE_ENV !== "production") {
        console.log(`\n[auth] password reset for ${email}:\n${url}\n`);
      }
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid request" }, { status: 400 });
}
