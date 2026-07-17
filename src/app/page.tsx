import Link from "next/link";
import { BrandMark, Button } from "@/components/ui";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6">
      <div className="flex max-w-xl flex-col items-start gap-6">
        <div className="flex items-center gap-3">
          <BrandMark className="h-10 w-10" />
          <span className="text-2xl font-semibold tracking-tight">ShelfReady</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          Make your store shoppable by AI agents.
        </h1>
        <p className="text-lg leading-relaxed text-slate-600">
          Compliant product feeds for every AI shopping surface, an
          agent-readiness audit with a prioritized fix-list, catalog
          enrichment, and freshness monitoring — for stores that aren&apos;t
          on Shopify.
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
    </main>
  );
}
