export type DocLink = { title: string; href: string }
export type DocSection = { title: string; items: DocLink[] }

export const docsNav: DocSection[] = [
  {
    title: "Getting started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Quickstart", href: "/docs/quickstart" },
      { title: "Core concepts", href: "/docs/concepts" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Connecting a store", href: "/docs/connect" },
      { title: "Running an audit", href: "/docs/audits" },
      { title: "AI enrichment", href: "/docs/enrichment" },
      { title: "Publishing feeds", href: "/docs/feeds" },
    ],
  },
  {
    title: "API reference",
    items: [
      { title: "Authentication", href: "/docs/api/authentication" },
      { title: "Products", href: "/docs/api/products" },
      { title: "Catalog", href: "/docs/api/catalog" },
      { title: "Syncs", href: "/docs/api/syncs" },
      { title: "Audits", href: "/docs/api/audits" },
      { title: "Feeds", href: "/docs/api/feeds" },
      { title: "Webhooks", href: "/docs/api/webhooks" },
      { title: "Usage", href: "/docs/api/usage" },
    ],
  },
]
