import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { activeMerchantFor, provisionNewUser } from "@/lib/tenancy";

function buildProviders(): Provider[] {
  const providers: Provider[] = [
    // Email + password (users created via /api/auth/register).
    Credentials({
      id: "credentials",
      name: "Password",
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;
        const [user] = await getDb()
          .select()
          .from(users)
          .where(eq(users.email, email));
        if (!user?.passwordHash) return null;
        const { verifyPassword } = await import("@/lib/password");
        if (!(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    // Email magic link via SMTPfast (dev fallback logs the URL).
    {
      id: "email",
      type: "email",
      name: "Email",
      from: "ShelfReady <login@useshelfready.com>",
      maxAge: 24 * 60 * 60,
      options: {},
      async sendVerificationRequest({ identifier, url }) {
        const { emailConfigured, sendEmail } = await import("@/lib/email");
        if (emailConfigured()) {
          await sendEmail({
            to: identifier,
            subject: "Sign in to ShelfReady",
            text: `Sign in to ShelfReady:\n\n${url}\n\nThis link expires in 24 hours. If you didn't request it, ignore this email.`,
            html: `<p>Sign in to <strong>ShelfReady</strong>:</p><p><a href="${url}">Click here to sign in</a></p><p style="color:#666">This link expires in 24 hours. If you didn't request it, ignore this email.</p>`,
          });
          return;
        }
        if (process.env.NODE_ENV === "production") {
          throw new Error("email transport not configured (SMTPFAST_API_KEY)");
        }
        console.log(`\n[auth] magic link for ${identifier}:\n${url}\n`);
      },
    },
  ];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(Google);
  }
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(GitHub);
  }
  return providers;
}

/** Which optional OAuth providers are configured (for the login UI). */
export function oauthProviders(): { id: string; label: string }[] {
  const list: { id: string; label: string }[] = [];
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    list.push({ id: "google", label: "Continue with Google" });
  }
  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    list.push({ id: "github", label: "Continue with GitHub" });
  }
  return list;
}

// Lazy config; JWT sessions (required by the Credentials provider —
// magic link + OAuth work identically under it).
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  providers: buildProviders(),
  events: {
    async createUser({ user }) {
      if (user.id) await provisionNewUser(getDb(), user.id);
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.activeMerchant = await activeMerchantFor(getDb(), token.sub);
      }
      return session;
    },
  },
}));

declare module "next-auth" {
  interface Session {
    activeMerchant: Awaited<ReturnType<typeof activeMerchantFor>>;
  }
}
