import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageShell, PageHero } from "@/components/marketing/page-shell"
import { Badge } from "@/components/ui/badge"
import { blogPosts, formatDate } from "@/lib/blog-data"

export const metadata: Metadata = {
  title: "Blog — ShelfReady",
  description: "Guides and ideas on making independent stores discoverable by AI shopping agents.",
}

export default function BlogPage() {
  const [featured, ...rest] = blogPosts

  return (
    <PageShell>
      <PageHero
        eyebrow="Blog"
        title="Notes on AI-ready commerce"
        description="Plain-English guides on specs, feeds, and getting your store recommended by the next generation of shopping agents."
      />

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Link
          href={`/blog/${featured.slug}`}
          className="group grid gap-6 overflow-hidden rounded-2xl border border-border bg-card p-6 transition-colors hover:border-brand/40 sm:p-8 lg:grid-cols-2 lg:items-center"
        >
          <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-border bg-gradient-to-br from-brand/12 via-background to-accent-amber/10">
            <span className="text-6xl font-semibold tracking-tight text-brand/40">SR</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <Badge>{featured.category}</Badge>
              <span className="text-xs text-muted-foreground">{featured.readingTime}</span>
            </div>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight group-hover:text-brand">
              {featured.title}
            </h2>
            <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{featured.excerpt}</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                {featured.author.initials}
              </span>
              <div className="text-sm">
                <div className="font-medium">{featured.author.name}</div>
                <div className="text-xs text-muted-foreground">{formatDate(featured.date)}</div>
              </div>
            </div>
          </div>
        </Link>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {rest.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col rounded-xl border border-border bg-card p-6 transition-colors hover:border-brand/40"
            >
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{post.category}</Badge>
                <span className="text-xs text-muted-foreground">{post.readingTime}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight group-hover:text-brand">
                {post.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{formatDate(post.date)}</span>
                <ArrowRight className="size-4 text-brand transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  )
}
