import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { Toc, type TocItem } from "@/components/docs/toc"

type PageLink = { title: string; href: string }

type DocPageProps = {
  eyebrow?: string
  title: string
  description?: string
  toc: TocItem[]
  children: ReactNode
  prev?: PageLink
  next?: PageLink
}

export function DocPage({ eyebrow, title, description, toc, children, prev, next }: DocPageProps) {
  return (
    <div className="flex gap-10 py-8 lg:py-10">
      <article className="min-w-0 flex-1 pb-16">
        {eyebrow ? (
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-pretty text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        <div className="doc-prose mt-8">{children}</div>

        {(prev || next) && (
          <nav className="mt-14 flex items-center justify-between gap-4 border-t border-border pt-6">
            {prev ? (
              <Link
                href={prev.href}
                className="group flex flex-col rounded-lg border border-border px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeft className="size-3" />
                  Previous
                </span>
                <span className="mt-0.5 text-sm font-medium">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={next.href}
                className="group flex flex-col items-end rounded-lg border border-border px-4 py-3 text-right transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  Next
                  <ArrowRight className="size-3" />
                </span>
                <span className="mt-0.5 text-sm font-medium">{next.title}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </article>

      <aside className="hidden w-56 shrink-0 xl:block">
        <Toc items={toc} />
      </aside>
    </div>
  )
}
