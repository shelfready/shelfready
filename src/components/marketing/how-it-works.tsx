import { Boxes, ClipboardCheck, Rss, Wand2 } from 'lucide-react'

const steps = [
  {
    icon: Boxes,
    step: '01',
    title: 'Connect',
    body: 'Link WooCommerce, BigCommerce, or Magento — or drop in a CSV. Read-only, synced automatically.',
  },
  {
    icon: ClipboardCheck,
    step: '02',
    title: 'Audit',
    body: 'Every SKU is scored against 12 weighted rules, with a prioritized fix list for the whole catalog.',
  },
  {
    icon: Wand2,
    step: '03',
    title: 'Enrich',
    body: 'Claude drafts stronger titles, descriptions, and attributes. You approve or reject each change.',
  },
  {
    icon: Rss,
    step: '04',
    title: 'Publish & monitor',
    body: 'Spec-compliant feeds go live at stable URLs. We watch for price and availability drift.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-brand">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
            From messy catalog to agent-ready in four steps
          </h2>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.step}
              className="relative rounded-2xl border border-border bg-background p-6"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <s.icon className="size-5" />
                </span>
                <span className="font-mono text-sm text-muted-foreground/60">{s.step}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
