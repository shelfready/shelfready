import { CopyButton } from "@/components/copy-button"
import { cn } from "@/lib/utils"

type CodeBlockProps = {
  code: string
  language?: string
  filename?: string
  className?: string
}

export function CodeBlock({ code, language = "bash", filename, className }: CodeBlockProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-muted/40", className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          {filename ?? language}
        </span>
        <CopyButton value={code} className="size-6" />
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  )
}
