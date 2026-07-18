import { PageShell } from "@/components/marketing/page-shell"

export type LegalSection = { heading: string; body: string[] }

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <PageShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="doc-prose mt-8">
          <p className="text-lg text-foreground">{intro}</p>
          {sections.map((s, i) => (
            <section key={s.heading}>
              <h2>
                {i + 1}. {s.heading}
              </h2>
              {s.body.map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </section>
          ))}
          <hr />
          <p className="text-sm">
            Questions about this policy? Contact{" "}
            <a href="mailto:support@useshelfready.com">support@useshelfready.com</a>.
          </p>
        </div>
      </section>
    </PageShell>
  )
}
