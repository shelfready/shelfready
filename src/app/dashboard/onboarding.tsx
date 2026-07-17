import Link from "next/link";
import { Card } from "@/components/ui";

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
    description: "Upload a CSV/XLSX or connect WooCommerce.",
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
    <Card className="mb-6 border-brand-200 bg-brand-50/50">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Get agent-ready</h2>
        <span className="text-sm text-slate-500">
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
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  complete
                    ? "border-brand-200 bg-white/60 opacity-70"
                    : "border-slate-200 bg-white hover:border-brand-400"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    complete ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {complete ? "✓" : i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {step.title}
                  </span>
                  <span className="block text-xs text-slate-500">{step.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
