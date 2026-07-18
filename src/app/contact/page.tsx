import type { Metadata } from "next";
import { BookOpen, Code2, LifeBuoy, Mail } from "lucide-react";
import { PageShell, PageHero } from "@/components/marketing/page-shell";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with ShelfReady for sales, support, or partnerships.",
};

const channels = [
  {
    icon: Mail,
    title: "Email us",
    body: "support@useshelfready.com",
    note: "Questions, sales, and partnerships.",
    href: "mailto:support@useshelfready.com",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    body: "Same inbox, tagged by the form",
    note: "Existing customers, day-to-day help.",
  },
  {
    icon: BookOpen,
    title: "Documentation",
    body: "Read the docs",
    note: "Guides, API reference, and webhooks.",
    href: "/docs",
  },
  {
    icon: Code2,
    title: "GitHub",
    body: "shelfready",
    note: "Changelog and releases.",
    href: "https://github.com/shelfready/shelfready",
  },
];

export default function ContactPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        description="Questions about compliance, pricing, or a partnership? We usually reply within one business day."
      />

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            {channels.map((c) => {
              const inner = (
                <>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <c.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                    <p className="text-sm text-foreground">{c.body}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.note}</p>
                  </div>
                </>
              );
              return c.href ? (
                <a
                  key={c.title}
                  href={c.href}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand/40"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={c.title}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card p-5"
                >
                  {inner}
                </div>
              );
            })}
          </div>
          <ContactForm />
        </div>
      </section>
    </PageShell>
  );
}
