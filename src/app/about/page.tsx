import type { Metadata } from "next";
import { Compass, Target, Users, Zap } from "lucide-react";
import { PageShell, PageHero } from "@/components/marketing/page-shell";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = {
  title: "About",
  description:
    "ShelfReady helps independent stores become spec-compliant, discoverable, and fresh for the new era of AI shopping agents.",
};

const values = [
  {
    icon: Compass,
    title: "Small stores first",
    body: "The biggest brands already have teams tuning their feeds. We build for the independent merchant who does not.",
  },
  {
    icon: Target,
    title: "Standards, not tricks",
    body: "We map every recommendation to a published spec. No ranking guarantees, no black-box promises.",
  },
  {
    icon: Zap,
    title: "Fix, don't just flag",
    body: "Anyone can hand you a list of problems. ShelfReady drafts the corrections and keeps your feeds fresh.",
  },
  {
    icon: Users,
    title: "Merchant trust",
    body: "Every AI proposal is reviewable before it ships. You stay in control of how your catalog is described.",
  },
];

// Real, verifiable facts about the product — not growth-theater metrics.
const facts = [
  { value: "3", label: "Feed formats: OpenAI ACP, Google, JSON-LD" },
  { value: "12", label: "Weighted audit rules per SKU" },
  { value: "5", label: "Connectors, from WooCommerce to plain CSV" },
  { value: "EU", label: "Hosted in the EU, isolation tested per release" },
];

export default function AboutPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Our mission"
        title="Independent stores deserve to be found by AI"
        description="Shopping is moving from search boxes to shopping agents. ShelfReady makes sure the stores that make the web interesting come along for the ride."
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 text-pretty leading-relaxed text-muted-foreground md:grid-cols-2">
          <p>
            When Shopify auto-enrolled millions of stores into agentic commerce in 2026,
            everyone else was left to read the specifications themselves. OpenAI&apos;s
            Agentic Commerce Protocol, Google&apos;s Merchant Center schema, schema.org
            markup — the fix for being invisible to shopping agents exists, but it is
            buried in hundreds of pages written for engineers at large retailers.
          </p>
          <p>
            ShelfReady is the tool we wished those stores had: an audit that speaks plain
            English, AI that drafts the fixes for your approval, and feeds that stay
            compliant and fresh automatically. It is a small, independent product — built
            in the open, priced honestly, and improving every week (see the changelog).
          </p>
        </div>

        <dl className="mt-14 grid gap-6 rounded-2xl border border-border bg-card p-8 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="sr-only">{fact.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight text-foreground">{fact.value}</dd>
              <dd className="mt-1 text-sm text-muted-foreground">{fact.label}</dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-16 text-xl font-semibold tracking-tight">What we believe</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {values.map((value) => (
            <div key={value.title} className="rounded-2xl border border-border bg-card p-6">
              <value.icon className="size-5 text-brand" />
              <h3 className="mt-3 text-base font-semibold">{value.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight">Talk to us</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Questions, feedback, or a store that needs to be on the shelf? We read
            everything.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <LinkButton href="/contact">Contact us</LinkButton>
            <LinkButton variant="outline" href="/register">
              Start free
            </LinkButton>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
