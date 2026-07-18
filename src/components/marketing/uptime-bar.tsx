"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function color(v: number) {
  if (v >= 1) return "bg-brand"
  if (v >= 0.97) return "bg-accent-amber"
  return "bg-destructive"
}

function label(v: number) {
  if (v >= 1) return "Operational"
  if (v >= 0.97) return "Degraded"
  return "Partial outage"
}

export function UptimeBar({ history }: { history: number[] }) {
  const days = history.length
  return (
    <TooltipProvider delay={80}>
      <div className="flex items-end gap-[3px]">
        {history.map((v, i) => {
          const daysAgo = days - 1 - i
          return (
            <Tooltip key={i}>
              <TooltipTrigger
                render={
                  <div
                    className={`h-9 flex-1 rounded-[2px] ${color(v)} transition-opacity hover:opacity-70`}
                  />
                }
              />
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium">
                    {daysAgo === 0 ? "Today" : `${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`}
                  </div>
                  <div className="text-muted-foreground">
                    {label(v)} · {(v * 100).toFixed(2)}%
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </TooltipProvider>
  )
}
