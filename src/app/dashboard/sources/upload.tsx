"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CANONICAL_COLUMNS, type CanonicalColumn } from "@/connectors/csv";
import { Badge, Button, Input, Label, Select, Spinner } from "@/components/ui";

type Preview = {
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  guessedColumns: Partial<Record<CanonicalColumn, string>>;
};

type ImportResult = {
  sourceId: string;
  runId: string;
  stats: {
    seen: number;
    upserted: number;
    rejected: number;
    warnings: number;
    rejections: {
      externalId: string | null;
      issues: { field: string; message: string }[];
    }[];
  };
};

const label: Record<CanonicalColumn, string> = {
  externalId: "SKU / ID (required)",
  title: "Title",
  description: "Description",
  brand: "Brand",
  url: "Product URL",
  imageUrl: "Image URL",
  price: "Price",
  availability: "Availability",
  gtin: "GTIN / EAN / UPC",
  mpn: "MPN",
};

export function UploadFlow() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [columns, setColumns] = useState<Partial<Record<CanonicalColumn, string>>>({});
  const [currency, setCurrency] = useState("EUR");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function doPreview(f: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    const body = new FormData();
    body.append("file", f);
    const res = await fetch("/api/upload/preview", { method: "POST", body });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "preview failed");
    setPreview(data);
    setColumns(data.guessedColumns);
  }

  async function doImport() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    body.append("mapping", JSON.stringify({ columns, defaultCurrency: currency }));
    const res = await fetch("/api/upload/import", { method: "POST", body });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "import failed");
    setResult(data);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/85"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f) void doPreview(f);
        }}
      />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {busy && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Working…
        </p>
      )}

      {preview && !result && (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            <strong>{preview.rowCount}</strong> rows detected. Confirm the column
            mapping:
          </p>
          <div className="grid gap-2">
            {CANONICAL_COLUMNS.map((field) => (
              <div key={field} className="grid grid-cols-2 items-center gap-2">
                <span className="text-sm text-muted-foreground">{label[field]}</span>
                <Select
                  value={columns[field] ?? ""}
                  onChange={(e) =>
                    setColumns((c) => ({ ...c, [field]: e.target.value || undefined }))
                  }
                >
                  <option value="">— not mapped —</option>
                  {preview.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
            <div className="grid grid-cols-2 items-center gap-2">
              <Label>Currency for prices</Label>
              <Input
                value={currency}
                maxLength={3}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <Button onClick={() => void doImport()} disabled={busy || !columns.externalId}>
            {busy ? <Spinner /> : null}
            Import {preview.rowCount} rows
          </Button>
        </div>
      )}

      {result && (
        <div className="grid gap-2 rounded-lg bg-muted/60 p-4">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Badge tone="success">{result.stats.upserted} imported</Badge>
            {result.stats.rejected > 0 && (
              <Badge tone="danger">{result.stats.rejected} rejected</Badge>
            )}
            {result.stats.warnings > 0 && (
              <Badge tone="warning">{result.stats.warnings} warnings</Badge>
            )}
          </p>
          {result.stats.rejections.length > 0 && (
            <ul className="grid gap-1 text-xs text-muted-foreground">
              {result.stats.rejections.slice(0, 20).map((r, i) => (
                <li key={i}>
                  <code className="font-mono">{r.externalId ?? "(no id)"}</code>:{" "}
                  {r.issues.map((iss) => `${iss.field} — ${iss.message}`).join("; ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
