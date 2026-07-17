import Link from "next/link";
import { BrandMark, Button } from "@/components/ui";
import { FreeAuditWidget } from "./free-audit-widget";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <span className="text-2xl font-semibold tracking-tight">ShelfReady</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            Make your store shoppable by AI agents.
          </h1>
          <p className="text-lg leading-relaxed text-slate-600">
            Compliant product feeds for every AI shopping surface, an
            agent-readiness audit with a prioritized fix-list, Claude-powered
            catalog enrichment, and freshness monitoring — for stores that
            aren&apos;t on Shopify.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button>Sign in</Button>
            </Link>
            <span className="font-mono text-xs uppercase tracking-wide text-slate-400">
              Pre-release
            </span>
          </div>
        </div>
        <FreeAuditWidget />
      </div>
    </main>
  );
}
