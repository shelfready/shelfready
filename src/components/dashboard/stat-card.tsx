import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  delta?: { value: string; positive: boolean };
  hint?: string;
  accent?: "brand" | "amber" | "primary" | "neutral";
};

const accentStyles: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "bg-brand/10 text-brand",
  amber: "bg-accent-amber/15 text-accent-amber-foreground",
  primary: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({ label, value, icon, delta, hint, accent = "neutral" }: StatCardProps) {
  return (
    <Card className="p-5 transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-md", accentStyles[accent])}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {delta ? (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              delta.positive ? "text-primary" : "text-destructive",
            )}
          >
            {delta.positive ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {delta.value}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
