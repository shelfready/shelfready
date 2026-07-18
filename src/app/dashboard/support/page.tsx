import { BookOpen, Code2, LifeBuoy, Mail, Rss } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";

export const metadata = { title: "Support — ShelfReady" };

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    body: "Guides for connecting sources, reading your audit, and publishing feeds.",
    href: "/docs",
    label: "Read the docs",
  },
  {
    icon: Code2,
    title: "API reference",
    body: "REST API for catalog push, sync triggers, audits, and webhooks.",
    href: "/docs/api/products",
    label: "API reference",
  },
  {
    icon: Rss,
    title: "Feed specs",
    body: "What each surface requires — ACP, Google Merchant Center, JSON-LD.",
    href: "/docs/feeds",
    label: "Feed guide",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stuck on something? Start with the docs, or write to us directly.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {resources.map((r) => (
          <Card key={r.title} className="flex flex-col p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <r.icon className="size-5" />
            </span>
            <h2 className="mt-3 text-sm font-semibold">{r.title}</h2>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{r.body}</p>
            <LinkButton variant="outline" size="sm" className="mt-4 self-start" href={r.href}>
              {r.label}
            </LinkButton>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-amber/15 text-accent-amber-foreground">
            <LifeBuoy className="size-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Email support</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              We usually reply within one business day. Include your store URL
              and what you expected to happen.
            </p>
          </div>
        </div>
        <LinkButton href="mailto:support@useshelfready.com" external>
          <Mail />
          support@useshelfready.com
        </LinkButton>
      </Card>
    </div>
  );
}
