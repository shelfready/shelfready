import type { ReactNode } from "react"
import { Info, Lightbulb, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const variants = {
  note: { icon: Info, className: "border-border bg-muted/50 text-foreground", iconClass: "text-muted-foreground" },
  tip: { icon: Lightbulb, className: "border-primary/25 bg-accent text-accent-foreground", iconClass: "text-primary" },
  warning: {
    icon: TriangleAlert,
    className: "border-accent-amber/30 bg-accent-amber/10 text-foreground",
    iconClass: "text-accent-amber",
  },
}

export function Callout({
  variant = "note",
  children,
}: {
  variant?: keyof typeof variants
  children: ReactNode
}) {
  const { icon: Icon, className, iconClass } = variants[variant]
  return (
    <div className={cn("mt-6 flex gap-3 rounded-xl border p-4", className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", iconClass)} />
      <div className="text-sm leading-relaxed [&>p]:mt-0 [&>p+p]:mt-2">{children}</div>
    </div>
  )
}
