import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { PageShell } from "@/components/marketing/page-shell"
import { Badge } from "@/components/ui/badge"
import { CtaBand } from "@/components/marketing/cta-band"
import { blogPosts, getPost, formatDate } from "@/lib/blog-data"

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return { title: "Post not found" }
  return { title: post.title, description: post.excerpt }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

  return (
    <PageShell>
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to blog
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <Badge>{post.category}</Badge>
          <span className="text-xs text-muted-foreground">{post.readingTime}</span>
        </div>
        <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <div className="mt-6 flex items-center gap-3 border-b border-border pb-6">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
            {post.author.initials}
          </span>
          <div className="text-sm">
            <div className="font-medium">{post.author.name}</div>
            <div className="text-xs text-muted-foreground">
              {post.author.role} · {formatDate(post.date)}
            </div>
          </div>
        </div>

        <div className="doc-prose mt-8">
          <p className="text-lg text-foreground">{post.excerpt}</p>
          {post.content.map((section) => (
            <div key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ))}
        </div>
      </article>
      <CtaBand />
    </PageShell>
  )
}
