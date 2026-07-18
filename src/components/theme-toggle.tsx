'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme()

  // Icons swap via CSS on the html.dark class — no mounted-state dance,
  // no hydration mismatch (the server doesn't know the theme).
  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle theme"
      onClick={() =>
        setTheme(
          document.documentElement.classList.contains('dark') ? 'light' : 'dark',
        )
      }
    >
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  )
}
