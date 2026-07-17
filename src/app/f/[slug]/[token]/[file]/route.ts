import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { FEED_FILES } from "@/feeds/render";
import { getArtifactStore } from "@/feeds/store";

/**
 * Public hosted feed endpoint: /f/<merchant-slug>/<token>/<file>.
 * Unauthenticated by design — the token is the capability. Any mismatch
 * (slug, token, file) returns an identical 404: no oracle.
 */
const NOT_FOUND = () => new Response("not found", { status: 404 });

function tokenMatches(expected: string | null, provided: string): boolean {
  if (!expected) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; token: string; file: string }> },
) {
  const { slug, token, file } = await params;
  if (!FEED_FILES.some((f) => f.file === file)) return NOT_FOUND();

  const db = getDb();
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.slug, slug));
  if (!merchant || !tokenMatches(merchant.feedToken, token)) return NOT_FOUND();

  const artifact = await getArtifactStore().get(`${merchant.id}/${file}`);
  if (!artifact) return NOT_FOUND();

  return new Response(artifact.body, {
    headers: {
      "Content-Type": artifact.contentType,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
