import { AlertTriangle, ArrowDownRight, CheckCircle2, FileJson, TrendingDown } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'
import { DiffViewer } from '@/components/diff-viewer'
import { cn } from '@/lib/utils'

// Illustrative sample matching the real feed-URL shape (/f/<slug>/<token>/<file>).
const feeds = [
  {
    id: 'acp',
    name: 'OpenAI ACP',
    spec: 'acp.json',
    url: 'useshelfready.com/f/demo/f3a9…/acp.json',
  },
  {
    id: 'gmc',
    name: 'Google Merchant Center',
    spec: 'gmc.tsv',
    url: 'useshelfready.com/f/demo/f3a9…/gmc.tsv',
  },
  {
    id: 'jsonld',
    name: 'schema.org JSON-LD',
    spec: 'jsonld.json',
    url: 'useshelfready.com/f/demo/f3a9…/jsonld.json',
  },
]

export function FeedsVisual() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
        <FileJson className="size-4 text-brand" />
        Hosted feed URLs
      </div>
      <ul className="space-y-2.5">
        {feeds.map((f) => (
          <li key={f.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">{f.name}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {f.spec}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
                {f.url}
              </code>
              <CopyButton value={f.url} label={`Copy ${f.name} URL`} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

const auditRows = [
  { rule: 'Missing GTIN / MPN', sev: 'critical', affected: 218 },
  { rule: 'Weak descriptions', sev: 'high', affected: 341 },
  { rule: 'Low-res primary image', sev: 'high', affected: 96 },
  { rule: 'Missing attributes', sev: 'medium', affected: 154 },
]

export function AuditVisual() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Catalog audit</p>
          <p className="text-xs text-muted-foreground">1,284 SKUs scored</p>
        </div>
        <div className="flex size-14 flex-col items-center justify-center rounded-xl bg-accent-amber/15 text-accent-amber-foreground">
          <span className="text-xl font-semibold tabular-nums">72</span>
          <span className="text-[9px] font-medium uppercase">Grade B</span>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {auditRows.map((r) => (
          <li
            key={r.rule}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-block size-2 rounded-full',
                  r.sev === 'critical'
                    ? 'bg-destructive'
                    : r.sev === 'high'
                      ? 'bg-accent-amber'
                      : 'bg-muted-foreground/50',
                )}
              />
              <span className="text-sm text-foreground">{r.rule}</span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{r.affected} SKUs</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EnrichmentVisual() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Enrichment review</p>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
          3 pending
        </span>
      </div>
      <p className="mb-2 font-mono text-[11px] text-muted-foreground">
        AOS-TENT-2P · description
      </p>
      <DiffViewer
        before="Lightweight 2-person tent. Easy to set up. Good for camping."
        after="The Summit 2-Person Backpacking Tent packs to 2.4 lbs with a freestanding pole system, 20D ripstop fly (3,000mm), and dual vestibules."
        className="md:grid-cols-1"
      />
      <div className="mt-3 flex gap-2">
        <button className="flex-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground">
          Approve
        </button>
        <button className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          Reject
        </button>
      </div>
    </div>
  )
}

const drift = [
  { sku: 'AOS-JKT-RAIN', label: 'Price $219 → $199', time: '1h ago', icon: TrendingDown, kind: 'price' },
  { sku: 'AOS-STOVE-X', label: 'In stock → Out of stock', time: '5h ago', icon: AlertTriangle, kind: 'avail' },
  { sku: 'AOS-BTL-32', label: 'Price $29 → $34', time: '1d ago', icon: ArrowDownRight, kind: 'price' },
]

export function DriftVisual() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Freshness monitor</p>
        <span className="inline-flex items-center gap-1 text-xs text-brand">
          <CheckCircle2 className="size-3.5" /> Syncing
        </span>
      </div>
      <ol className="relative space-y-4 border-l border-border pl-5">
        {drift.map((d) => (
          <li key={d.sku} className="relative">
            <span className="absolute -left-[1.55rem] top-0.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-accent-amber-foreground">
              <d.icon className="size-3" />
            </span>
            <p className="font-mono text-[11px] text-muted-foreground">{d.sku}</p>
            <p className="text-sm text-foreground">{d.label}</p>
            <p className="text-[11px] text-muted-foreground">{d.time}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
