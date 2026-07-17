import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, passwordPolicyError } from "@/lib/password";
import { provisionNewUser } from "@/lib/tenancy";

const bodySchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string(),
  name: z.string().max(100).optional(),
});

/** Email+password registration; sign-in happens client-side after. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password, name } = parsed.data;
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
  await provisionNewUser(db, userId);
  return NextResponse.json({ ok: true });
}
