import { getDb } from "@/db";
import { forMerchant } from "@/db/tenant";
import { requireMerchant } from "@/lib/require-merchant";

function csvCell(value: string | null | undefined): string {
  const s = value ?? "";
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Dashboard export: current persisted audit findings as CSV. */
export async function GET() {
  const { merchant } = await requireMerchant();
  const scope = forMerchant(getDb(), merchant.merchantId);
  const [findings, products] = await Promise.all([
    scope.auditFindings.list(),
    scope.products.list(),
  ]);
  const titleById = new Map(products.map((p) => [p.id, p]));

  const header = "sku,title,code,severity,field,message";
  const lines = findings.map((f) => {
    const product = f.productId ? titleById.get(f.productId) : undefined;
    return [
      csvCell(product?.externalId ?? ""),
      csvCell(product?.title ?? ""),
      csvCell(f.code),
      csvCell(f.severity),
      csvCell(f.field),
      csvCell(f.message),
    ].join(",");
  });

  return new Response([header, ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shelfready-audit.csv"',
    },
  });
}
