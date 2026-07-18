import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { AuditWidget } from '@/components/marketing/audit-widget'
import { HeroMockup } from '@/components/marketing/hero-mockup'
import { LinkButton } from '@/components/link-button'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 [background-image:radial-gradient(var(--color-muted-foreground)_1px,transparent_1.5px)] [background-size:22px_22px] [mask-image:radial-gradient(70%_55%_at_50%_0%,black,transparent_72%)] opacity-[0.18]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,var(--brand-muted),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 right-0 -z-10 h-72 w-72 rounded-full bg-accent-amber/10 blur-3xl"
      />
      <div className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-6 lg:pt-20 lg:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-brand" />
              For WooCommerce, BigCommerce, Magento & CSV stores
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-[3.35rem] lg:leading-[1.05]">
              AI assistants are recommending products. Make sure yours are on the shelf.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
              ShelfReady turns any non-Shopify catalog into spec-compliant, discoverable,
              and fresh product feeds — so shopping agents like ChatGPT, Claude, and
              Perplexity can actually read what you sell.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <LinkButton size="lg" className="h-11 px-6" href="/register">
                Start free
                <ArrowRight />
              </LinkButton>
              <LinkButton
                size="lg"
                variant="outline"
                className="h-11 px-6"
                href="/demo"
              >
                See the demo
              </LinkButton>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {['No credit card', '25 SKUs free forever', 'All feed formats'].map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-4">
            <HeroMockup />
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-2xl">
          <div className="mb-3 text-center">
            <h2 className="text-sm font-medium text-foreground">
              Check your store&apos;s agent readiness — free
            </h2>
          </div>
          <AuditWidget />
        </div>
      </div>
    </section>
  )
}
