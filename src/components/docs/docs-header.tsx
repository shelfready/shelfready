"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/link-button"
import { DocsSidebar } from "@/components/docs/docs-sidebar"

export function DocsHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle docs menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X /> : <Menu />}
          </Button>
          <Link href="/" className="rounded-md focus-visible:outline-2 focus-visible:outline-ring">
            <Logo />
          </Link>
          <span className="hidden rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
            Docs
          </span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/v1/openapi.json"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            OpenAPI 3.1
          </a>
          <ThemeToggle />
          <LinkButton variant="ghost" size="sm" href="/login" className="hidden sm:inline-flex">
            Sign in
          </LinkButton>
          <LinkButton size="sm" href="/dashboard">
            Dashboard
          </LinkButton>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="max-h-[70vh] overflow-y-auto px-4 py-5">
            <DocsSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </header>
  )
}
