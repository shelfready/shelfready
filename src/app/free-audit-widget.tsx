"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, Input, Spinner } from "@/components/ui";

type Result = {
  pagesScanned: number;
  productsFound: number;
  score: number;
  grade: string;
  topIssues: { code: string; message: string; count: number }[];
  noStructuredData: boolean;
};

const GRADE_COLOR: Record<string, string> = {
  A: "text-brand-700",
  B: "text-brand-600",
  C: "text-amber-600",
  D: "text-orange-600",
  F: "text-red-600",
};

export function FreeAuditWidget() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function scan() {
    setBusy(true);
    setError(null);
    setResult(null);
    const target = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch("/api/free-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Scan failed.");
    setResult(data);
  }

  return (
    <Card className="w-full max-w-xl">
      <h2 className="mb-1 text-lg font-semibold">
        How ready is your store for AI shopping agents?
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        Free instant scan — no signup. We check what ChatGPT, Google, and
        Perplexity can actually read from your product pages.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="yourstore.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && url && void scan()}
        />
        <Button onClick={() => void scan()} disabled={busy || !url}>
          {busy ? <Spinner /> : null}
          {busy ? "Scanning…" : "Scan"}
        </Button>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <div className="mt-5 grid gap-3">
          <div className="flex items-center gap-4">
            <span className={`text-5xl font-bold ${GRADE_COLOR[result.grade] ?? ""}`}>
              {result.grade}
            </span>
            <div>
              <p className="text-xl font-semibold">{result.score}/100 agent-ready</p>
              <p className="text-sm text-slate-500">
                {result.productsFound} products readable across {result.pagesScanned}{" "}
                pages scanned
              </p>
            </div>
          </div>

          {result.noStructuredData ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              No machine-readable product data found — AI agents can&apos;t see
              your catalog at all. That&apos;s exactly what ShelfReady fixes.
            </p>
          ) : (
            result.topIssues.length > 0 && (
              <ul className="grid gap-1.5">
                {result.topIssues.map((issue) => (
                  <li key={issue.code} className="flex items-start gap-2 text-sm">
                    <Badge tone="warning">{issue.count}×</Badge>
                    <span className="text-slate-600">{issue.message}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          <Link href="/login">
            <Button className="w-full">
              Fix this — compliant feeds, audits & monitoring
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
