import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { FEED_FILES, getOrCreateFeedToken } from "@/feeds/render";
import { requireApiKey } from "@/lib/api-auth";

/** GET /api/v1/feeds — hosted feed URLs + the last render run. */
export async function GET(req: Request) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;

  const db = getDb();
  const [merchant] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, auth.merchantId));
  const token = await getOrCreateFeedToken(db, auth.merchantId);
  const base = process.env.AUTH_URL ?? new URL(req.url).origin;

  const runs = await forMerchant(db, auth.merchantId).feedRuns.list();
  const lastRender = runs
    .filter((r) => r.kind === "render")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];

  return NextResponse.json({
    data: {
      feeds: FEED_FILES.map(({ file, contentType }) => ({
        file,
        content_type: contentType,
        url: `${base}/f/${merchant.slug}/${token}/${file}`,
      })),
      last_render: lastRender
        ? {
            run_id: lastRender.id,
            status: lastRender.status,
            started_at: lastRender.startedAt,
            finished_at: lastRender.finishedAt,
          }
        : null,
    },
  });
}

/** POST /api/v1/feeds — trigger a re-render of all feed artifacts. */
export async function POST(req: Request) {
  const auth = await requireApiKey(req, "write");
  if (auth instanceof NextResponse) return auth;
  const { renderFeeds } = await import("@/feeds/render");
  try {
    const { runId, stats } = await renderFeeds(getDb(), auth.merchantId);
    return NextResponse.json({ data: { run_id: runId, stats } });
  } catch (e) {
    return NextResponse.json(
      { error: { status: 422, message: (e as Error).message } },
      { status: 422 },
    );
  }
}
