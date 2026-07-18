import { cn } from "@/lib/utils";

/** 30-day API usage bar chart (server-rendered SVG, v0 tokens). */
export function UsageChart({
  days,
  className,
}: {
  days: { day: string; total: number }[];
  className?: string;
}) {
  const width = 600;
  const height = 120;
  const max = Math.max(1, ...days.map((d) => d.total));
  const barW = width / days.length;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full"
        role="img"
        aria-label="API requests per day, last 30 days"
      >
        {days.map((d, i) => {
          const h = Math.max(d.total > 0 ? 3 : 1, (d.total / max) * (height - 8));
          return (
            <rect
              key={d.day}
              x={i * barW + barW * 0.15}
              y={height - h}
              width={barW * 0.7}
              height={h}
              rx={2}
              className={d.total > 0 ? "fill-brand" : "fill-muted"}
            >
              <title>{`${d.day}: ${d.total.toLocaleString()} requests`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{days[0]?.day}</span>
        <span>{days[days.length - 1]?.day}</span>
      </div>
    </div>
  );
}
