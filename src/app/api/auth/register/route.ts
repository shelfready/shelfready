import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants, users } from "@/db/schema";
import { hashPassword, passwordPolicyError } from "@/lib/password";
import { provisionNewUser } from "@/lib/tenancy";

const bodySchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string(),
  name: z.string().max(100).optional(),
  // Onboarding convenience: pre-fills the seller settings' store URL.
  storeUrl: z
    .string()
    .trim()
    .max(200)
    .transform((u) => (u && !/^https?:\/\//i.test(u) ? `https://${u}` : u))
    .transform((u) => u.replace(/^http:\/\//i, "https://"))
    .refine((u) => !u || z.string().url().safeParse(u).success, {
      message: "Enter a valid store URL.",
    })
    .optional(),
});

/** Email+password registration; sign-in happens client-side after. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue?.path[0] === "storeUrl" ? issue.message : "Enter a valid email and password." },
      { status: 400 },
    );
  }
  const { email, password, name, storeUrl } = parsed.data;
  const policyError = passwordPolicyError(password);
  if (policyError) return NextResponse.json({ error: policyError }, { status: 400 });

  const db = getDb();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing?.passwordHash) {
    return NextResponse.json(
      { error: "An account with this email already exists — sign in instead." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  let userId: string;
  if (existing) {
    // Magic-link/OAuth user adding a password.
    await db.update(users).set({ passwordHash, name: existing.name ?? name ?? null }).where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    const [user] = await db
      .insert(users)
      .values({ email, name: name ?? null, passwordHash, emailVerified: null })
      .returning();
    userId = user.id;
  }
  const merchantId = await provisionNewUser(db, userId);

  if (storeUrl) {
    // Seed seller settings without clobbering anything already configured.
    const [merchant] = await db.select().from(merchants).where(eq(merchants.id, merchantId));
    const settings = (merchant?.settings ?? {}) as Record<string, unknown>;
    if (!settings.sellerUrl) {
      await db
        .update(merchants)
        .set({ settings: { ...settings, sellerUrl: storeUrl } })
        .where(eq(merchants.id, merchantId));
    }
  }

  return NextResponse.json({ ok: true });
}
