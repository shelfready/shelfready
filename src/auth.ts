import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import type { Provider } from "next-auth/providers";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDb } from "@/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { activeMerchantFor, provisionNewUser } from "@/lib/tenancy";

const providers: Provider[] = [
  // Email magic link via SMTPfast (infra/email/); dev fallback logs the
  // URL to the server console when no key is configured.
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

// GitHub OAuth only when configured (needs an OAuth app; dev works without).
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub);
}

// Lazy config: getDb() must not run at import time — `next build` collects
// page data without a DATABASE_URL (and CI has none).
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/login/check-email" },
  providers,
  events: {
    async createUser({ user }) {
      if (user.id) await provisionNewUser(getDb(), user.id);
    },
  },
  callbacks: {
    async session({ session, user }) {
      const merchant = await activeMerchantFor(getDb(), user.id);
      session.activeMerchant = merchant;
      return session;
    },
  },
}));

declare module "next-auth" {
  interface Session {
    activeMerchant: Awaited<ReturnType<typeof activeMerchantFor>>;
  }
}
