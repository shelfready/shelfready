import { ClipboardCheck, Radar, Rss, Wand2 } from 'lucide-react'
import type { ComponentType } from 'react'
import {
  AuditVisual,
  DriftVisual,
  EnrichmentVisual,
  FeedsVisual,
} from '@/components/marketing/feature-visuals'
import { cn } from '@/lib/utils'

type Feature = {
  icon: ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  body: string
  points: string[]
  visual: ComponentType
}

const features: Feature[] = [
  {
    icon: Rss,
    eyebrow: 'Hosted product feeds',
    title: 'Spec-compliant feeds at stable URLs',
    body: 'Generate OpenAI ACP, Google Merchant Center, and schema.org JSON-LD feeds from your catalog — hosted, versioned, and always in sync.',
    points: [
      'OpenAI ACP 2025-09-12, GMC, and JSON-LD',
      'Stable URLs with rotating access tokens',
      'Re-rendered automatically on every sync',
    ],
    visual: FeedsVisual,
  },
  {
    icon: ClipboardCheck,
    eyebrow: 'Agent-readiness audit',
    title: 'Know exactly what to fix, and why',
    body: 'Every SKU and your whole catalog scored 0–100 with a letter grade against 12 weighted rules — from missing GTINs to weak descriptions and invalid prices.',
    points: [
      '12 weighted rules, prioritized by impact',
      'Per-SKU breakdown with the exact field',
      'Actionable fix hints for every issue',
    ],
    visual: AuditVisual,
  },
  {
    icon: Wand2,
    eyebrow: 'AI enrichment',
    title: 'Claude drafts, you approve',
    body: 'Claude proposes stronger titles, descriptions, and attributes. Review a clear before/after diff and approve or reject each change — nothing ships without you.',
    points: [
      'Before/after diffs for every proposal',
      'Approve, reject, or batch-approve',
      'Rationale attached to each edit',
    ],
    visual: EnrichmentVisual,
  },
  {
    icon: Radar,
    eyebrow: 'Freshness monitoring',
    title: 'Catch drift before agents do',
    body: 'We continuously compare your live store to your published feeds and flag price or availability drift, with email digests so nothing goes stale.',
    points: [
      'Price and availability drift detection',
      'Timeline of every change',
      'Weekly email digests',
    ],
    visual: DriftVisual,
  },
]

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-brand">Everything you need</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
          Four capabilities, one honest promise: spec-compliant, discoverable, and fresh
        </h2>
      </div>

      <div className="mt-14 space-y-16 lg:space-y-24">
        {features.map((f, i) => {
          const Visual = f.visual
          const reversed = i % 2 === 1
          return (
            <div
              key={f.eyebrow}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              <div className={cn(reversed && 'lg:order-2')}>
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <f.icon className="size-5" />
                </span>
                <p className="mt-4 text-sm font-medium text-brand">{f.eyebrow}</p>
                <h3 className="mt-1.5 text-2xl font-semibold tracking-tight text-balance text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
                <ul className="mt-5 space-y-2.5">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-foreground">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
                        <svg viewBox="0 0 12 12" className="size-2.5" fill="none">
                          <path
                            d="M2.5 6.2 5 8.5 9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn(reversed && 'lg:order-1')}>
                <Visual />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
