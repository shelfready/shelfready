import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DiffViewer({
  before,
  after,
  className,
  fieldLabel,
}: {
  before: string
  after: string
  className?: string
  fieldLabel?: string
}) {
  return (
    <div className={cn('grid gap-3 md:grid-cols-2', className)}>
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
          <span className="inline-block size-1.5 rounded-full bg-destructive" />
          Before
          {fieldLabel ? (
            <span className="ml-auto font-mono text-[10px] text-muted-foreground">
              {fieldLabel}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground line-through decoration-destructive/40">
          {before}
        </p>
      </div>
      <div className="rounded-lg border border-brand/30 bg-brand/5 p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-brand">
          <ArrowRight className="size-3" />
          After
          <span className="ml-auto rounded-full bg-brand/10 px-1.5 py-0.5 font-mono text-[10px] text-brand">
            Claude
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{after}</p>
      </div>
    </div>
  )
}
