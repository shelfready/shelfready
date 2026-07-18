import Link from 'next/link'
import { Logo } from '@/components/logo'

// Columns grow as M10 pages land: #96 adds Company (about/blog/contact),
// #97 adds Legal, #98 adds Status — no dead links in between.
const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Demo', href: '/demo' },
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'Documentation', href: '/docs' },
      { label: 'OpenAPI spec', href: '/api/v1/openapi.json' },
      { label: 'GitHub', href: 'https://github.com/shelfready/shelfready' },
    ],
  },
  {
    title: 'Contact',
    links: [{ label: 'support@useshelfready.com', href: 'mailto:support@useshelfready.com' }],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Make your independent store spec-compliant, discoverable, and fresh for AI
              shopping agents.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-medium text-foreground">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} ShelfReady · useshelfready.com
          </p>
          <p className="text-sm text-muted-foreground">
            Spec-compliant, discoverable, and fresh — never a ranking guarantee.
          </p>
        </div>
      </div>
    </footer>
  )
}
