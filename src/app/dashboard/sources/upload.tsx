"use client";

import { useState } from "react";
import { CANONICAL_COLUMNS, type CanonicalColumn } from "@/connectors/csv";

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
    body.append(
      "mapping",
      JSON.stringify({ columns, defaultCurrency: currency }),
    );
    const res = await fetch("/api/upload/import", { method: "POST", body });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "import failed");
    setResult(data);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          if (f) void doPreview(f);
        }}
      />

      {error && <p style={{ color: "#c00" }}>{error}</p>}
      {busy && <p>Working…</p>}

      {preview && !result && (
        <>
          <p>
            {preview.rowCount} rows detected. Map your columns, then import:
          </p>
          <table cellPadding={4}>
            <tbody>
              {CANONICAL_COLUMNS.map((field) => (
                <tr key={field}>
                  <td>{label[field]}</td>
                  <td>
                    <select
                      value={columns[field] ?? ""}
                      onChange={(e) =>
                        setColumns((c) => ({
                          ...c,
                          [field]: e.target.value || undefined,
                        }))
                      }
                    >
                      <option value="">— not mapped —</option>
                      {preview.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              <tr>
                <td>Currency for prices</td>
                <td>
                  <input
                    value={currency}
                    maxLength={3}
                    size={4}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <button onClick={() => void doImport()} disabled={busy || !columns.externalId}>
            Import {preview.rowCount} rows
          </button>
        </>
      )}

      {result && (
        <div>
          <h3>Import finished</h3>
          <p>
            {result.stats.upserted} imported · {result.stats.rejected} rejected ·{" "}
            {result.stats.warnings} warnings
          </p>
          {result.stats.rejections.length > 0 && (
            <ul>
              {result.stats.rejections.slice(0, 20).map((r, i) => (
                <li key={i}>
                  <code>{r.externalId ?? "(no id)"}</code>:{" "}
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
