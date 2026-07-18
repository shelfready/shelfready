import Link from "next/link"
import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"

type ButtonProps = ComponentProps<typeof Button>

type LinkButtonProps = Omit<ButtonProps, "render"> & {
  href: string
  external?: boolean
}

/**
 * A Button that renders as a Next.js Link (an <a> element).
 * Sets nativeButton={false} so Base UI applies anchor semantics instead of
 * native button semantics.
 */
export function LinkButton({ href, external, children, ...props }: LinkButtonProps) {
  return (
    <Button
      {...props}
      nativeButton={false}
      render={
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" />
        ) : (
          <Link href={href} />
        )
      }
    >
      {children}
    </Button>
  )
}
