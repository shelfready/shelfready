import { ShoppingBag, Store, Boxes, Layers, Package, Globe } from "lucide-react"

// Only connectors that actually exist (src/connectors/) belong here.
const platforms = [
  { name: "WooCommerce", icon: ShoppingBag },
  { name: "BigCommerce", icon: Store },
  { name: "Magento", icon: Boxes },
  { name: "Google Shopping feeds", icon: Layers },
  { name: "Feed URL import", icon: Globe },
  { name: "CSV / XLSX", icon: Package },
]

export function LogoCloud() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm font-medium text-muted-foreground">
          Connects to the platforms independent stores actually run on
        </p>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          {platforms.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <p.icon className="size-5" />
              <span className="text-sm font-medium tracking-tight">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
