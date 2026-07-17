import { parse } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { registerConnector } from "./registry";

/**
 * CSV/XLSX upload source (push-only). Files are parsed at upload time and
 * streamed straight into the sync pipeline (runSyncItems) — rows are never
 * persisted; only the column mapping lives on sources.config for
 * re-uploads.
 */

export type RawRow = Record<string, string>;

export interface CsvMapping {
  /** canonical field -> source column header (subset; unmapped = absent) */
  columns: Partial<Record<CanonicalColumn, string>>;
  /** ISO-4217 applied to parsed prices (CSV rarely carries currency) */
  defaultCurrency: string;
}

export const CANONICAL_COLUMNS = [
  "externalId",
  "title",
  "description",
  "brand",
  "url",
  "imageUrl",
  "price",
  "availability",
  "gtin",
  "mpn",
] as const;
export type CanonicalColumn = (typeof CANONICAL_COLUMNS)[number];

/** Parse an uploaded file (by extension) into header-keyed string rows. */
export async function parseUpload(
  filename: string,
  buffer: Buffer,
): Promise<{ headers: string[]; rows: RawRow[] }> {
  if (/\.xlsx?$/i.test(filename)) return parseXlsx(buffer);
  return parseCsv(buffer);
}

/**
 * Passing several delimiters to csv-parse treats them ALL as active at
 * once (a comma inside "€ 1.299,00" would split the field) — so sniff
 * the real one from the header line first.
 */
function detectDelimiter(buffer: Buffer): string {
  const firstLine = buffer.toString("utf8", 0, 4096).split(/\r?\n/, 1)[0];
  let best = ",";
  let bestCount = -1;
  for (const candidate of [",", ";", "\t", "|"]) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function parseCsv(buffer: Buffer): { headers: string[]; rows: RawRow[] } {
  const records: RawRow[] = parse(buffer, {
    bom: true,
    columns: true,
    delimiter: detectDelimiter(buffer),
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, rows: records };
}

async function parseXlsx(
  buffer: Buffer,
): Promise<{ headers: string[]; rows: RawRow[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? "").trim();
  });

  const rows: RawRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: RawRow = {};
    let hasValue = false;
    headers.forEach((header, i) => {
      if (!header) return;
      const cell = row.getCell(i + 1);
      const text = cell.text?.trim() ?? "";
      record[header] = text;
      if (text) hasValue = true;
    });
    if (hasValue) rows.push(record);
  });
  return { headers: headers.filter(Boolean), rows };
}

const HEADER_SYNONYMS: Record<CanonicalColumn, string[]> = {
  externalId: ["sku", "id", "itemid", "productid", "externalid", "handle"],
  title: ["title", "name", "productname", "producttitle"],
  description: ["description", "body", "bodyhtml", "details"],
  brand: ["brand", "vendor", "manufacturer", "make"],
  url: ["url", "link", "producturl", "productlink"],
  imageUrl: ["imageurl", "image", "imagelink", "imagesrc", "picture"],
  price: ["price", "amount", "cost", "regularprice", "saleprice"],
  availability: ["availability", "stockstatus", "instock", "stock", "inventory"],
  gtin: ["gtin", "ean", "upc", "barcode", "isbn", "gtin13", "gtin12"],
  mpn: ["mpn", "partnumber", "manufacturerpartnumber"],
};

/** Guess canonical-field ← header assignments from common names. */
export function guessMapping(headers: string[]): CsvMapping["columns"] {
  const normalized = headers.map((h) => ({
    header: h,
    key: h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  }));
  const columns: CsvMapping["columns"] = {};
  for (const field of CANONICAL_COLUMNS) {
    for (const synonym of HEADER_SYNONYMS[field]) {
      const hit = normalized.find((h) => h.key === synonym);
      if (hit) {
        columns[field] = hit.header;
        break;
      }
    }
  }
  return columns;
}

/**
 * "1.299,00", "€12.99", "12,99 лв", "1299" → integer minor units.
 * When both separators appear, the last one is the decimal separator.
 */
export function parsePriceToMinor(input: string): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let normalized: string;
  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSep = lastDot > lastComma ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    normalized = cleaned
      .split(thousandSep)
      .join("")
      .replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    // Single comma: decimal if followed by 1-2 digits, else thousands.
    const digitsAfter = cleaned.length - lastComma - 1;
    normalized =
      digitsAfter > 0 && digitsAfter <= 2
        ? cleaned.replace(",", ".")
        : cleaned.split(",").join("");
  } else {
    const digitsAfter = lastDot === -1 ? 0 : cleaned.length - lastDot - 1;
    normalized =
      lastDot !== -1 && digitsAfter === 3 ? cleaned.split(".").join("") : cleaned;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

const IN_STOCK = new Set(["instock", "in stock", "1", "true", "yes", "available", "y"]);
const OUT_OF_STOCK = new Set(["outofstock", "out of stock", "0", "false", "no", "unavailable", "sold out", "soldout", "n"]);

export function normalizeAvailability(input: string | undefined): string {
  const key = (input ?? "").trim().toLowerCase();
  if (!key) return "unknown";
  if (IN_STOCK.has(key)) return "in_stock";
  if (OUT_OF_STOCK.has(key)) return "out_of_stock";
  if (["preorder", "pre-order", "pre_order"].includes(key)) return "pre_order";
  if (["backorder", "back-order", "backordered"].includes(key)) return "backorder";
  return "unknown";
}

/** Apply a mapping to a raw row, producing canonical-shaped input. */
export function rowToCanonical(row: RawRow, mapping: CsvMapping): unknown {
  const pick = (field: CanonicalColumn): string | undefined => {
    const header = mapping.columns[field];
    const value = header ? row[header]?.trim() : undefined;
    return value || undefined;
  };

  const price = pick("price");
  const priceMinor = price != null ? parsePriceToMinor(price) : undefined;
  return {
    externalId: pick("externalId"),
    title: pick("title"),
    description: pick("description")?.replace(/<[^>]+>/g, "").trim() || undefined,
    brand: pick("brand"),
    url: pick("url"),
    imageUrl: pick("imageUrl"),
    priceMinor: priceMinor ?? undefined,
    currency: priceMinor != null ? mapping.defaultCurrency : undefined,
    availability: normalizeAvailability(pick("availability")),
    gtin: pick("gtin"),
    mpn: pick("mpn"),
  };
}

registerConnector({
  type: "csv",
  capabilities: { pull: false, watchInventory: false },
  async *fetchProducts() {
    throw new Error(
      "csv sources are push-only — import via file upload (runSyncItems)",
    );
  },
});
