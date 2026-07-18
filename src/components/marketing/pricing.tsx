import { Check } from "lucide-react"
import { LinkButton } from "@/components/link-button"
import { cn } from "@/lib/utils"

// Mirrors src/billing/plans.ts — every claim here maps to a real
// entitlement (maxSkus / hostedFeeds / enrichment / freshnessMonitoring).
const tiers = [
  {
    name: "Free",
    monthly: 0,
    description: "Everything you need to see where you stand.",
    cta: "Start free",
    href: "/register",
    highlighted: false,
    features: [
      "Up to 25 SKUs",
      "Hosted feeds — all formats (ACP, Google, JSON-LD)",
      "Full agent-readiness audit + fix list",
      "All connectors incl. feed-URL import",
    ],
  },
  {
    name: "Starter",
    monthly: 29,
    description: "For small catalogs that need to stay fresh.",
    cta: "Start with Starter",
    href: "/register",
    highlighted: false,
    features: [
      "Up to 500 SKUs",
      "Everything in Free",
      "Freshness & drift monitoring with email alerts",
      "Scheduled re-syncs every 6 hours",
    ],
  },
  {
    name: "Growth",
    monthly: 79,
    description: "For growing brands that want AI doing the tedious work.",
    cta: "Start with Growth",
    href: "/register",
    highlighted: true,
    features: [
      "Up to 5,000 SKUs",
      "Everything in Starter",
      "Claude-powered catalog enrichment with approval workflow",
      "REST API + signed webhooks",
    ],
  },
  {
    name: "Scale",
    monthly: 199,
    description: "For high-volume catalogs and agencies.",
    cta: "Start with Scale",
    href: "/register",
    highlighted: false,
    features: [
      "Up to 50,000 SKUs",
      "Everything in Growth",
      "Priority sync scheduling",
      "Priority support",
    ],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-primary">Pricing</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple plans that scale with your catalog
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Start free, upgrade when you are ready. No credit card required to run your first audit.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                tier.highlighted ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              {tier.highlighted && (
                <span className="mb-4 inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-card-foreground">{tier.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tier.description}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-card-foreground">
                  ${tier.monthly}
                </span>
                <span className="text-sm text-muted-foreground">/ mo</span>
              </div>
              <LinkButton
                className="mt-6"
                variant={tier.highlighted ? "default" : "outline"}
                href={tier.href}
              >
                {tier.cta}
              </LinkButton>
              <ul className="mt-6 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-card-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span className="leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
