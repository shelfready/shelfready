import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { getOrCreateDemoMerchant, DEMO_SLUG } from "@/demo/seed";
import { FEED_FILES } from "@/feeds/render";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const SURFACES: Record<string, string> = {
  "acp.csv": "OpenAI ACP (CSV)",
  "acp.json": "OpenAI ACP (JSON)",
  "gmc.tsv": "Google Merchant Center (TSV)",
  "jsonld.json": "schema.org JSON-LD (per product)",
};

export default async function DemoFeeds() {
  const db = getDb();
  const merchantId = await getOrCreateDemoMerchant(db);
  const [m] = await db.select().from(merchants).where(eq(merchants.id, merchantId));

  return (
    <>
      <PageHeader
        title="Feeds"
        description="These are real, fetchable endpoints — open one and see exactly what AI surfaces receive."
      />
      <div className="grid gap-4">
        {FEED_FILES.map(({ file }) => {
          const url = `/f/${DEMO_SLUG}/${m.feedToken}/${file}`;
          return (
            <Card key={file} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{SURFACES[file]}</p>
                <p className="truncate font-mono text-xs text-slate-500">{url}</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Open feed ↗
              </a>
            </Card>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-slate-400">
        For your own store these URLs carry a private, rotatable token and
        regenerate automatically on every catalog sync.
      </p>
    </>
  );
}
