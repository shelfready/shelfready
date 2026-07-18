import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { findMerchantByApiKeyHash, recordApiUsage } from "@/db/tenant";

/**
 * Merchant API-key auth for /api/v1 (#58). Keys look like sr_<64 hex>,
 * are shown once at creation, and are stored only as sha256 hashes —
 * lookup is by hash (deterministic), so no plaintext ever touches the DB.
 */

export type ApiScope = "read" | "write";

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `sr_${randomBytes(32).toString("hex")}`;
  return { key, hash: hashApiKey(key), prefix: key.slice(0, 11) };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// ---------------------------------------------------------------------------
// Per-key sliding-window rate limit. In-memory on purpose: we run a single
// app instance (ADR-0005); an external store buys nothing yet.
// ---------------------------------------------------------------------------

const WINDOW_MS = 60_000;
export const RATE_LIMIT = 60; // requests per window per key

const windows = new Map<string, number[]>();

export function checkRateLimit(
  keyId: string,
  now = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  const hits = (windows.get(keyId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= RATE_LIMIT) {
    windows.set(keyId, hits);
    return { ok: false, retryAfterSec: Math.ceil((hits[0] + WINDOW_MS - now) / 1000) };
  }
  hits.push(now);
  windows.set(keyId, hits);
  // Drop stale keys so the map cannot grow unbounded.
  if (windows.size > 10_000) {
    for (const [k, v] of windows) {
      if (v.every((t) => now - t >= WINDOW_MS)) windows.delete(k);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Test seam. */
export function resetRateLimits() {
  windows.clear();
}

// ---------------------------------------------------------------------------

export interface ApiAuth {
  merchantId: string;
  keyId: string;
  scopes: string[];
}

export function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: { status, message } }, { status });
}

type RouteHandler<A extends unknown[]> = (
  req: Request,
  ...args: A
) => Promise<Response>;

/**
 * Wrap a /api/v1 handler so an unhandled exception returns the API's JSON
 * error envelope instead of a bare empty 500 (the API's error contract
 * applies to crashes too). The cause is logged server-side, never leaked.
 */
export function withApiErrors<A extends unknown[]>(
  handler: RouteHandler<A>,
): RouteHandler<A> {
  return async (req, ...args) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      console.error(`[api-v1] ${req.method} ${new URL(req.url).pathname}:`, error);
      return apiError(500, "internal error — try again or contact support");
    }
  };
}

/**
 * Authenticate a /api/v1 request. Returns the auth context, or a ready
 * NextResponse (401/403/429) the route must return as-is.
 */
export async function requireApiKey(
  req: Request,
  scope: ApiScope,
): Promise<ApiAuth | NextResponse> {
  const header = req.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("sr_")) {
    return apiError(401, "missing or malformed API key (Authorization: Bearer sr_…)");
  }
  const auth = await findMerchantByApiKeyHash(getDb(), hashApiKey(key));
  if (!auth) return apiError(401, "invalid or revoked API key");
  if (!auth.scopes.includes(scope)) {
    return apiError(403, `this key lacks the "${scope}" scope`);
  }
  const limit = checkRateLimit(auth.keyId);
  if (!limit.ok) {
    const res = apiError(429, "rate limit exceeded (60 requests/minute)");
    res.headers.set("Retry-After", String(limit.retryAfterSec));
    return res;
  }
  // Usage analytics (issue #108) — fire-and-forget so a counter hiccup
  // never fails or slows the request itself.
  const group = new URL(req.url).pathname.split("/")[3] ?? "unknown";
  void recordApiUsage(getDb(), auth.merchantId, auth.keyId, group).catch(
    () => undefined,
  );
  return auth;
}
