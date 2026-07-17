import Image from "next/image";
import Link from "next/link";
import { BrandMark, Badge, Button, Card } from "@/components/ui";
import { PLANS, type PlanId } from "@/billing/plans";
import { FreeAuditWidget } from "./free-audit-widget";

const PLAN_ORDER: PlanId[] = ["free", "starter", "growth", "scale"];
const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: ["Hosted AI-surface feeds", "Agent-readiness audit", "CSV & WooCommerce sync"],
  starter: ["Everything in Free", "Freshness monitoring", "Price & stock drift alerts"],
  growth: ["Everything in Starter", "Claude catalog enrichment", "All connectors"],
  scale: ["Everything in Growth", "50,000-SKU catalogs", "Priority support"],
};

const FEATURES = [
  {
    title: "Hosted, always-fresh feeds",
    body: "Spec-compliant OpenAI ACP (CSV + JSON), Google Merchant Center, and schema.org JSON-LD — generated from your catalog, hosted on stable URLs, regenerated on every sync.",
  },
  {
    title: "Agent-readiness audit",
    body: "Every SKU scored 0–100 against what AI surfaces actually require: GTIN validity, required fields, structured data, freshness. With a fix-first list ordered by impact.",
  },
  {
    title: "Claude catalog enrichment",
    body: "Claude drafts better descriptions, infers missing brands, and fixes overlong titles — grounded in your data, never invented. You approve every change before it ships.",
  },
  {
    title: "Freshness monitoring",
    body: "We re-sync on a schedule and compare your feeds against your live product pages daily. Price or stock drift triggers an email before agents notice.",
  },
  {
    title: "Any platform, one pipeline",
    body: "CSV/XLSX upload works with every cart on day one. WooCommerce connects via REST. BigCommerce, Magento, and generic feed re-mapping are on the roadmap.",
  },
  {
    title: "Your data, handled properly",
    body: "Store credentials encrypted at rest, strict per-tenant isolation, EU hosting, and daily backups. We read your catalog — we never touch your checkout.",
  },
];

const FAQ = [
  {
    q: "What exactly is 'agentic commerce'?",
    a: "AI assistants — ChatGPT, Perplexity, Google's shopping surfaces — now recommend and link products directly in their answers. They decide what to show by reading structured product data: feeds and on-page markup. Stores that publish it get surfaced; stores that don't are invisible.",
  },
  {
    q: "My store isn't on Shopify. Is that a problem?",
    a: "That's exactly who we're for. Shopify enrolled its merchants into agentic storefronts automatically; WooCommerce, BigCommerce, Magento, and custom carts got nothing. ShelfReady closes that gap without replatforming.",
  },
  {
    q: "Do you guarantee my products appear in ChatGPT?",
    a: "No — and nobody honestly can. Platforms control their own merchant approval. What we do: make your catalog compliant with each surface's spec, keep it fresh, and give you the audit trail proving it. Compliance is the part you control, and we make it automatic.",
  },
  {
    q: "How does the free audit work?",
    a: "Paste your store URL and we scan a sample of product pages the same way AI agents do — reading your public structured data. You get a 0–100 score and the top issues instantly. No signup, and we don't store what we scan.",
  },
  {
    q: "What do I need to get started?",
    a: "A product CSV/XLSX export or WooCommerce API keys, and five minutes. Upload, map your columns once, set your seller details — your feed URLs and audit are live immediately.",
  },
  {
    q: "Does the AI change my catalog without asking?",
    a: "Never. Claude proposes; you see the exact before/after diff and approve or reject each change. Nothing touches your data without your explicit click.",
  },
  {
    q: "Do you process payments or checkout?",
    a: "No. We're discovery-only by design: agents find your products and buy on your site, on your checkout, with your merchant-of-record status untouched.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — plans are monthly, cancellation is self-serve in the billing portal and takes effect at period end. Your feed URLs keep working until then.",
  },
];

const STEPS = [
  {
    title: "Connect your catalog",
    body: "Upload a CSV/XLSX or connect WooCommerce. We validate every SKU against the specs and show you exactly what's importable.",
    image: "/marketing/dashboard.png",
    alt: "ShelfReady dashboard with an imported catalog",
  },
  {
    title: "See what agents see",
    body: "Your agent-readiness score, graded A–F, with a fix-first list ordered by impact. Fix issues yourself or let Claude draft the fixes for approval.",
    image: "/marketing/audit.png",
    alt: "Agent-readiness audit with score and fix-first list",
  },
  {
    title: "Publish your feed URLs",
    body: "Copy your hosted ACP, Google, and JSON-LD endpoints into each surface once. We keep them fresh forever — synced, monitored, alerting on drift.",
    image: "/marketing/feeds.png",
    alt: "Hosted feed URLs for OpenAI ACP, Google Merchant Center and JSON-LD",
  },
];

function SectionTitle({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brand-700">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h2>
      {sub && <p className="mt-3 text-slate-600">{sub}</p>}
    </div>
  );
}

export default function Home() {
  return (
    <main className="bg-slate-50">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight">ShelfReady</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <Link href="/login"><Button size="sm">Sign in</Button></Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <Badge tone="success">For stores that aren&apos;t on Shopify</Badge>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            AI assistants are recommending products.
            <span className="text-brand-700"> Make sure yours are on the shelf.</span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-600">
            ShelfReady turns any catalog into spec-compliant, always-fresh feeds
            for ChatGPT, Google, and Perplexity — with an audit that shows
            exactly what&apos;s blocking your products, Claude-drafted fixes you
            approve, and monitoring that catches drift before agents do.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/login"><Button>Start free — 25 SKUs</Button></Link>
            <a href="#how" className="text-sm font-medium text-brand-700 hover:underline">
              See how it works ↓
            </a>
          </div>
          <p className="text-xs text-slate-400">
            No credit card. Feed URLs live in five minutes.
          </p>
        </div>
        <FreeAuditWidget />
      </section>

      {/* Problem */}
      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xl leading-relaxed text-slate-700">
            In 2026, Shopify auto-enrolled millions of stores into agentic
            commerce. <strong>Everyone else got nothing.</strong> If your store
            runs WooCommerce, BigCommerce, Magento, or a custom cart, AI
            assistants are recommending your competitors — not because their
            products are better, but because theirs are machine-readable.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle
          eyebrow="How it works"
          title="From spreadsheet to agent-ready in three steps"
        />
        <div className="grid gap-12">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <p className="mb-2 font-mono text-sm text-brand-700">Step {i + 1}</p>
                <h3 className="mb-2 text-2xl font-semibold tracking-tight">{step.title}</h3>
                <p className="text-slate-600">{step.body}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 shadow-lg">
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={1216}
                  height={620}
                  className="w-full"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-y border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionTitle
            eyebrow="What you get"
            title="One pipeline, every AI surface"
            sub="Everything a non-Shopify merchant needs to be discoverable — and nothing that touches your checkout."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <h3 className="mb-1.5 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <SectionTitle
          eyebrow="Pricing"
          title="Flat monthly tiers. Priced by catalog size."
          sub="No metering, no surprises — you know your SKU count, so you know your bill."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const highlight = planId === "growth";
            return (
              <Card
                key={planId}
                className={highlight ? "border-brand-600 ring-1 ring-brand-600" : ""}
              >
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-base font-semibold">{plan.label}</h3>
                  {highlight && <Badge tone="success">popular</Badge>}
                </div>
                <p className="text-3xl font-semibold">
                  ${plan.priceUsdMonthly}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
                <p className="mb-3 text-sm text-slate-500">
                  up to {plan.maxSkus.toLocaleString("en-US")} SKUs
                </p>
                <ul className="mb-5 grid gap-1 text-sm text-slate-600">
                  {PLAN_FEATURES[planId].map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login">
                  <Button
                    variant={highlight ? "primary" : "secondary"}
                    className="w-full"
                    size="sm"
                  >
                    {plan.priceUsdMonthly === 0 ? "Start free" : "Get started"}
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Need white-label or 50,000+ SKUs? <a className="underline" href="mailto:support@useshelfready.com">Talk to us</a>.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-3xl px-6">
          <SectionTitle eyebrow="FAQ" title="The honest answers" />
          <div className="grid gap-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + footer */}
      <section className="bg-brand-900 py-16 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-3 text-3xl font-semibold tracking-tight text-white">
            Find out your score in 30 seconds.
          </h2>
          <p className="mb-6 text-brand-100">
            Scan your store free above, or start with 25 SKUs on us — feeds,
            audit, and fix-list included.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50"
          >
            Start free
          </Link>
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <BrandMark className="h-5 w-5" />
            <span>© 2026 ShelfReady · useshelfready.com</span>
          </div>
          <div className="flex gap-5">
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
            <a href="mailto:support@useshelfready.com" className="hover:text-slate-900">Contact</a>
            <a href="https://github.com/shelfready/shelfready" className="hover:text-slate-900">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
