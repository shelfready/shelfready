import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { PageShell, PageHero } from "@/components/marketing/page-shell";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = {
  title: "Careers",
  description: "Working at ShelfReady.",
};

export default function CareersPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Careers"
        title="No open roles right now"
        description="ShelfReady is a small, independent product and we're not hiring at the moment — no invented job listings here."
      />
      <section className="mx-auto max-w-2xl px-4 pb-20 text-center sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-8">
          <Mail className="mx-auto size-6 text-brand" />
          <h2 className="mt-3 text-lg font-semibold tracking-tight">
            Think you&apos;d make ShelfReady better anyway?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            We keep a short list of people we&apos;d love to work with when the
            time comes. Tell us what you&apos;d want to build.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <LinkButton href="mailto:support@useshelfready.com?subject=Careers">
              Introduce yourself
            </LinkButton>
            <LinkButton variant="outline" href="/about">
              About ShelfReady
            </LinkButton>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
