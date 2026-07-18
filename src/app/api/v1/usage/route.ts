import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireApiKey, withApiErrors } from "@/lib/api-auth";

const WINDOW_DAYS = 30;

/** GET /api/v1/usage — daily API request counts for the caller's
 * merchant over the trailing 30 days, plus per-key totals. */
async function _GET(req: Request) {
  const auth = await requireApiKey(req, "read");
  if (auth instanceof NextResponse) return auth;

  const scope = forMerchant(getDb(), auth.merchantId);
  const [rows, keys] = await Promise.all([
    scope.apiUsage.window(WINDOW_DAYS),
    scope.apiKeys.list(),
  ]);

  const byDay = new Map<string, { total: number; endpoints: Record<string, number> }>();
  const byKey = new Map<string, { last7d: number; last30d: number }>();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  for (const row of rows) {
    const day = byDay.get(row.day) ?? { total: 0, endpoints: {} };
    day.total += row.count;
    day.endpoints[row.endpoint] = (day.endpoints[row.endpoint] ?? 0) + row.count;
    byDay.set(row.day, day);

    const key = byKey.get(row.apiKeyId) ?? { last7d: 0, last30d: 0 };
    key.last30d += row.count;
    if (row.day >= sevenDaysAgo) key.last7d += row.count;
    byKey.set(row.apiKeyId, key);
  }

  return NextResponse.json({
    data: {
      window_days: WINDOW_DAYS,
      days: [...byDay.entries()].map(([day, d]) => ({
        day,
        total: d.total,
        endpoints: d.endpoints,
      })),
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        revoked: Boolean(k.revokedAt),
        requests_7d: byKey.get(k.id)?.last7d ?? 0,
        requests_30d: byKey.get(k.id)?.last30d ?? 0,
      })),
    },
    rate_limit: { requests_per_minute: 60 },
  });
}

export const GET = withApiErrors(_GET);
