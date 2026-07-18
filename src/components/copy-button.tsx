'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyButton({
  value,
  className,
  size = 'icon-sm',
  label = 'Copy',
}: {
  value: string
  className?: string
  size?: 'icon-sm' | 'icon' | 'sm'
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard unavailable
    }
  }

  const isText = size === 'sm'

  return (
    <Button
      variant="outline"
      size={size}
      onClick={copy}
      className={className}
      aria-label={copied ? 'Copied' : label}
    >
      {copied ? (
        <Check className={cn('text-brand')} />
      ) : (
        <Copy />
      )}
      {isText ? <span>{copied ? 'Copied' : label}</span> : null}
    </Button>
  )
}
