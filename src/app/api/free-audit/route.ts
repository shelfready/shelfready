import { NextResponse } from "next/server";
import { z } from "zod";
import { runFreeAudit } from "@/free-audit/scan";

/**
 * Public acquisition hook: unauthenticated store scan. Same-origin
 * fetching, page/byte caps, and a per-IP in-memory rate limit
 * (Upstash-backed limiter is tracked for production scale in #58).
 */
const bodySchema = z.object({
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//.test(u), { message: "must be http(s)" }),
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
      { error: "Too many scans — try again in a minute." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid store URL." }, { status: 400 });
  }

  try {
    const result = await runFreeAudit(parsed.data.url);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "We couldn't scan that store. Check the URL and try again." },
      { status: 422 },
    );
  }
}
