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
  // Email magic link. Dev transport logs the sign-in URL to the server
  // console; a real transport (Resend) arrives with email infra.
  // TODO(#30): real email transport for magic links + alerts.
  {
    id: "email",
    type: "email",
    name: "Email",
    from: "ShelfReady <login@useshelfready.com>",
    maxAge: 24 * 60 * 60,
    options: {},
    async sendVerificationRequest({ identifier, url }) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("email transport not configured (TODO(#30))");
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
