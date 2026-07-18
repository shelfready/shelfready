import { cn } from "@/lib/utils"

const methodColors: Record<string, string> = {
  GET: "bg-primary/10 text-primary",
  POST: "bg-accent-amber/20 text-accent-amber",
  PUT: "bg-accent-amber/20 text-accent-amber",
  DELETE: "bg-destructive/10 text-destructive",
}

export function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
      <span
        className={cn(
          "rounded px-2 py-0.5 font-mono text-xs font-semibold",
          methodColors[method] ?? "bg-muted text-muted-foreground",
        )}
      >
        {method}
      </span>
      <code className="font-mono text-sm text-foreground">{path}</code>
    </div>
  )
}

type Param = { name: string; type: string; required?: boolean; description: string }

export function ParamTable({ params }: { params: Param[] }) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2.5 font-medium">Parameter</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {params.map((p) => (
            <tr key={p.name} className="align-top">
              <td className="whitespace-nowrap px-4 py-3">
                <code className="font-mono text-xs text-foreground">{p.name}</code>
                {p.required ? (
                  <span className="ml-1.5 text-[10px] font-medium uppercase text-destructive">req</span>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                {p.type}
              </td>
              <td className="px-4 py-3 leading-relaxed text-muted-foreground">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
