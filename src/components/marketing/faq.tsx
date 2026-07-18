import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  {
    q: "What exactly does a catalog audit check?",
    a: "ShelfReady scans every SKU against the requirements of the channels you sell on — Google Shopping, Amazon, Meta, and more. It flags missing GTINs, short or duplicate titles, thin descriptions, invalid images, missing attributes like color and size, and pricing or availability mismatches.",
  },
  {
    q: "How does AI enrichment work?",
    a: "For any product with gaps, ShelfReady generates channel-optimized titles, descriptions, and structured attributes based on your existing data. You review every suggestion side-by-side with the original and approve in one click — nothing is published without your sign-off.",
  },
  {
    q: "Which platforms and feeds are supported?",
    a: "We support Google Merchant Center, Amazon, Meta Commerce, TikTok Shop, and custom CSV/XML feeds out of the box. Shopify, BigCommerce, and WooCommerce connect directly so audits stay in sync with your store.",
  },
  {
    q: "Do I need to connect my store to try it?",
    a: "No. You can paste a product URL or upload a sample feed and get a full audit and health score in seconds — no account or store connection required for your first run.",
  },
  {
    q: "Is my product data secure?",
    a: "Yes. Data is encrypted in transit and at rest, scoped per workspace, and never used to train shared models. Scale plans add SSO, role-based access, and data residency options.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. Plans are month-to-month or annual, and you can cancel or downgrade from your billing settings at any time with no penalty.",
  },
]

export function Faq() {
  return (
    <section id="faq" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </div>
        <Accordion className="mt-10">
          {faqs.map((faq) => (
            <AccordionItem key={faq.q} value={faq.q}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-pretty leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
