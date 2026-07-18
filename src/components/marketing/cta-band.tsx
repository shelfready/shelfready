import { ArrowRight } from "lucide-react"
import { LinkButton } from "@/components/link-button"

export function CtaBand() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border bg-primary px-6 py-14 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight text-primary-foreground sm:text-4xl">
            Run your first catalog audit in under a minute
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty leading-relaxed text-primary-foreground/80">
            Paste a product URL and see exactly what is blocking your listings from getting approved and converting.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <LinkButton
              size="lg"
              variant="secondary"
              href="/register"
              className="group"
            >
              Start free
              <ArrowRight className="ml-1 size-4 transition-transform group-hover:translate-x-0.5" />
            </LinkButton>
            <LinkButton
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              href="/docs"
            >
              Read the docs
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  )
}
