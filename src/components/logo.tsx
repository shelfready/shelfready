import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-brand text-brand-foreground',
        'size-8',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="4" y="6" width="16" height="2.6" rx="1.3" fill="currentColor" />
        <rect
          x="4"
          y="11"
          width="16"
          height="2.6"
          rx="1.3"
          fill="currentColor"
          opacity="0.75"
        />
        <rect
          x="4"
          y="16"
          width="16"
          height="2.6"
          rx="1.3"
          fill="currentColor"
          opacity="0.5"
        />
      </svg>
    </span>
  )
}

export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string
  wordmarkClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span
        className={cn(
          'text-[15px] font-semibold tracking-tight text-foreground',
          wordmarkClassName,
        )}
      >
        ShelfReady
      </span>
    </span>
  )
}
