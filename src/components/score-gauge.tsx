import { cn } from '@/lib/utils'

type ScoreGaugeProps = {
  score: number
  grade?: string
  size?: number
  strokeWidth?: number
  className?: string
  label?: string
}

function scoreColor(score: number) {
  if (score >= 85) return 'var(--brand)'
  if (score >= 70) return 'var(--accent-amber)'
  if (score >= 50) return 'oklch(0.72 0.16 55)'
  return 'var(--destructive)'
}

export function ScoreGauge({
  score,
  grade,
  size = 180,
  strokeWidth = 14,
  className,
  label,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  // 270-degree arc gauge
  const arc = 0.75
  const dash = circumference * arc
  const progress = (score / 100) * dash
  const color = scoreColor(score)

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Readiness score ${score} out of 100${grade ? `, grade ${grade}` : ''}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(135deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tracking-tight tabular-nums text-foreground">
          {score}
        </span>
        {grade ? (
          <span
            className="mt-0.5 text-sm font-medium"
            style={{ color }}
          >
            Grade {grade}
          </span>
        ) : null}
        {label ? (
          <span className="mt-1 text-xs text-muted-foreground">{label}</span>
        ) : null}
      </div>
    </div>
  )
}
