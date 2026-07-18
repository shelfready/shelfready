"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Search, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Phase = "idle" | "scanning" | "done" | "error";

const steps = [
  "Fetching your store",
  "Discovering product pages",
  "Extracting structured data",
  "Scoring agent readiness",
];

interface FreeAuditResult {
  storeUrl: string;
  pagesScanned: number;
  productsFound: number;
  score: number;
  grade: string;
  eligible: number;
  topIssues: { code: string; message: string; count: number }[];
  noStructuredData: boolean;
}

export function AuditWidget() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<FreeAuditResult | null>(null);
  const [error, setError] = useState("");
  const target = useRef(0);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || phase === "scanning") return;
    setPhase("scanning");
    setStepIndex(0);
    setScore(0);
    setResult(null);
    try {
      const res = await fetch("/api/free-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "We couldn't scan that store — try again.");
        setPhase("error");
        return;
      }
      const scan = data as FreeAuditResult;
      if (scan.productsFound === 0) {
        setError(
          scan.noStructuredData
            ? "We found pages but no machine-readable product data — that itself is the #1 agent-readiness problem. Sign up and connect your catalog to see the full picture."
            : "We couldn't find product pages on that URL. Try your storefront's homepage.",
        );
        setPhase("error");
        return;
      }
      target.current = scan.score;
      setResult(scan);
      setPhase("done");
    } catch {
      setError("Network hiccup — try again in a moment.");
      setPhase("error");
    }
  }

  // Step ticker while the real scan runs (holds on the last step).
  useEffect(() => {
    if (phase !== "scanning") return;
    if (stepIndex >= steps.length - 1) return;
    const t = setTimeout(() => setStepIndex((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [phase, stepIndex]);

  // Count-up animation once the real score is in.
  useEffect(() => {
    if (phase !== "done") return;
    let raf: number;
    const animate = () => {
      setScore((s) => {
        if (s >= target.current) return target.current;
        raf = requestAnimationFrame(animate);
        return Math.min(s + 2, target.current);
      });
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const checks = result
    ? [
        {
          label: `Structured product data on ${result.productsFound} of ${result.pagesScanned} pages`,
          ok: !result.noStructuredData && result.productsFound > 0,
        },
        {
          label: `${result.eligible} of ${result.productsFound} products error-free`,
          ok: result.eligible === result.productsFound,
        },
        ...result.topIssues.slice(0, 2).map((issue) => ({
          label: `${issue.message} (${issue.count}×)`,
          ok: false,
        })),
      ]
    : [];

  return (
    <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
      <form
        onSubmit={start}
        className="flex flex-col gap-2 rounded-xl bg-muted/50 p-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste your store URL"
            aria-label="Store URL"
            className="h-11 border-transparent bg-background pl-9 shadow-none"
          />
        </div>
        <Button type="submit" size="lg" className="h-11 px-5" disabled={phase === "scanning"}>
          {phase === "scanning" ? (
            <>
              <Loader2 className="animate-spin" />
              Scanning
            </>
          ) : (
            <>
              Run free audit
              <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <div className="px-3 py-3">
        {phase === "idle" ? (
          <p className="text-center text-xs text-muted-foreground">
            Instant, no signup. We scan a sample of your product pages for agent readiness.
          </p>
        ) : null}

        {phase === "error" ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <span>{error}</span>
          </div>
        ) : null}

        {phase === "scanning" ? (
          <ul className="space-y-1.5">
            {steps.map((step, i) => (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-2 text-sm transition-opacity",
                  i <= stepIndex ? "opacity-100" : "opacity-40",
                )}
              >
                {i < stepIndex ? (
                  <CheckCircle2 className="size-4 text-brand" />
                ) : i === stepIndex ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="size-4 rounded-full border border-border" />
                )}
                <span className={i < stepIndex ? "text-foreground" : "text-muted-foreground"}>
                  {step}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {phase === "done" && result ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-16 flex-col items-center justify-center rounded-xl bg-brand/10 text-brand">
                <span className="text-2xl font-semibold tabular-nums">{score}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide">
                  Grade {result.grade}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Readiness score</p>
                <p className="max-w-[16rem] text-xs text-muted-foreground">
                  From {result.productsFound} products found on your store. Sign up for the
                  full SKU-level audit.
                </p>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="size-3.5 shrink-0 text-brand" />
                  ) : (
                    <XCircle className="size-3.5 shrink-0 text-destructive" />
                  )}
                  <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {phase === "done" || phase === "error" ? (
        <div className="px-3 pb-2">
          <LinkButton className="w-full" href="/register">
            Get the full audit — free
            <ArrowRight />
          </LinkButton>
        </div>
      ) : null}
    </div>
  );
}
