import Link from "next/link";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface OnboardingState {
  hasSource: boolean;
  hasSellerSettings: boolean;
  feedsRendered: boolean;
  auditRun: boolean;
}

const STEPS: {
  key: keyof OnboardingState;
  title: string;
  description: string;
  href: string;
}[] = [
  {
    key: "hasSource",
    title: "Add your catalog",
    description: "Upload a CSV/XLSX or connect your store.",
    href: "/dashboard/sources",
  },
  {
    key: "hasSellerSettings",
    title: "Set seller details",
    description: "Name, URL, and country — required on every feed item.",
    href: "/dashboard/settings",
  },
  {
    key: "feedsRendered",
    title: "Get your feed URLs",
    description: "Hosted ACP, Google, and JSON-LD feeds, always fresh.",
    href: "/dashboard/feeds",
  },
  {
    key: "auditRun",
    title: "Review your audit",
    description: "See your agent-readiness score and what to fix first.",
    href: "/dashboard/audit",
  },
];

export function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const done = STEPS.filter((s) => state[s.key]).length;
  if (done === STEPS.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.03] p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Get agent-ready</h2>
        <span className="text-sm text-muted-foreground">
          {done}/{STEPS.length} done
        </span>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {STEPS.map((step, i) => {
          const complete = state[step.key];
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                  complete
                    ? "border-primary/20 bg-card/60 opacity-70"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    complete
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="size-3" /> : i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">
                    {step.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {step.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
