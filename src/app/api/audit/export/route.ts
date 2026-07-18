import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { merchants } from "@/db/schema";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";
import { expandCatalog } from "@/feeds/expand";
import { sellerSettingsOf } from "@/feeds/render";
import { auditCatalog } from "@/audit/rules";

function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Dashboard export: the live audit, same engine as /dashboard/audit —
 * always agrees with what the page shows. */
export async function GET() {
  const { merchant } = await requireMerchant();
  const db = getDb();
  const scope = forMerchant(db, merchant.merchantId);
  const [m] = await db
    .select()
    .from(merchants)
    .where(eq(merchants.id, merchant.merchantId));
  const [productRows, variantRows] = await Promise.all([
    scope.products.list(),
    scope.variants.list(),
  ]);
  const audit = auditCatalog(
    expandCatalog(productRows, variantRows),
    sellerSettingsOf(m),
  );
  const titleByItemId = new Map(
    audit.items.map(({ entry }) => [entry.itemId, entry.title]),
  );

  const header = "sku,title,code,severity,field,message";
  const lines = [
    ...audit.items.flatMap(({ entry, findings }) =>
      findings.map((f) =>
        [
          csvCell(entry.itemId),
          csvCell(titleByItemId.get(entry.itemId)),
          csvCell(f.code),
          csvCell(f.severity),
          csvCell(f.field),
          csvCell(f.message),
        ].join(","),
      ),
    ),
    ...audit.catalogFindings.map((f) =>
      ["", "", csvCell(f.code), csvCell(f.severity), csvCell(f.field), csvCell(f.message)].join(","),
    ),
  ];

  return new Response([header, ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shelfready-audit.csv"',
    },
  });
}
