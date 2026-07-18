import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  "Score every SKU against 12 weighted agent-readiness rules",
  "Hosted ACP, Google Merchant Center, and JSON-LD feeds",
  "AI-drafted titles and attributes you review before they apply",
];

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col lg:w-1/2">
        <header className="flex items-center justify-between p-6">
          <Link href="/" aria-label="ShelfReady home">
            <Logo />
          </Link>
          <ThemeToggle />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <footer className="p-6 text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Back to home
          </Link>{" "}
          · © {new Date().getFullYear()} ShelfReady
        </footer>
      </div>

      <div className="relative hidden w-1/2 flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary-foreground/70">
            Agent-readiness platform
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight">
            Make your catalog ready for the age of AI shopping agents.
          </h2>
        </div>

        <ul className="flex flex-col gap-4">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary-foreground/80" />
              <span className="text-pretty leading-relaxed text-primary-foreground/90">
                {item}
              </span>
            </li>
          ))}
        </ul>

        <div className="rounded-xl bg-primary-foreground/10 p-5">
          <p className="text-pretty leading-relaxed text-primary-foreground/90">
            Spec-compliant, discoverable, and fresh — never a ranking guarantee.
            What agents can verify, they can recommend.
          </p>
        </div>
      </div>
    </div>
  );
}
