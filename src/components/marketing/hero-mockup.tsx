import { CheckCircle2, Circle } from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { ScoreGauge } from '@/components/score-gauge'
import { Sparkline } from '@/components/sparkline'
import { cn } from '@/lib/utils'

const feedRows = [
  { name: 'OpenAI ACP', spec: '2025-09-12', fresh: true },
  { name: 'Google Merchant', spec: 'GMC XML', fresh: true },
  { name: 'schema.org', spec: 'JSON-LD', fresh: false },
]

export function HeroMockup() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-brand/10 to-transparent blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
            <LogoMark className="size-3.5 rounded" />
            app.useshelfready.com
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-2">
          {/* score card */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-background p-4">
            <ScoreGauge score={72} grade="B" size={132} strokeWidth={11} />
            <div className="mt-2 flex items-center gap-1.5 text-xs text-brand">
              <Sparkline data={[58, 61, 60, 64, 66, 68, 72]} width={70} height={20} />
              <span className="font-medium">+6 this week</span>
            </div>
          </div>

          {/* catalog + feeds */}
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="text-[11px] font-medium text-muted-foreground">Catalog</p>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-xl font-semibold tabular-nums text-foreground">1,284</span>
                <span className="text-xs text-muted-foreground">products · 3,691 variants</span>
              </div>
            </div>
            <div className="flex-1 rounded-xl border border-border bg-background p-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">Feeds</p>
              <ul className="space-y-2">
                {feedRows.map((f) => (
                  <li key={f.name} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{f.name}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{f.spec}</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        f.fresh
                          ? 'bg-brand/10 text-brand'
                          : 'bg-accent-amber/20 text-accent-amber-foreground',
                      )}
                    >
                      {f.fresh ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Circle className="size-3" />
                      )}
                      {f.fresh ? 'Fresh' : 'Stale'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
