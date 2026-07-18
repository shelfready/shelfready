import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of ShelfReady.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="July 18, 2026"
      intro="These terms govern your use of ShelfReady at useshelfready.com. By creating an account you agree to them."
      sections={[
        {
          heading: "The service",
          body: [
            "ShelfReady generates spec-compliant product feeds (OpenAI ACP, Google Merchant Center, schema.org JSON-LD), audits catalogs for agent readiness, drafts AI enrichment proposals for your approval, and monitors freshness and drift.",
          ],
        },
        {
          heading: "No ranking guarantee",
          body: [
            "We make your catalog spec-compliant, machine-readable, and fresh. We do not and cannot guarantee inclusion, ranking, or recommendation in ChatGPT, Google, Perplexity, or any other AI surface — those decisions belong to the surface operators, and anyone promising otherwise is overselling.",
          ],
        },
        {
          heading: "Your content and responsibilities",
          body: [
            "You retain all rights to your catalog data. You confirm you have the right to connect and publish it, that your product listings are lawful, and that credentials you provide are authorized (we recommend read-only keys).",
            "You are responsible for reviewing AI enrichment proposals before applying them — nothing changes in your catalog without your approval.",
          ],
        },
        {
          heading: "Plans and billing",
          body: [
            "Paid plans are billed monthly through Stripe and can be cancelled anytime, effective at the end of the billing period. Tier limits (SKU caps and features) are described on the pricing page. We may change prices with at least 30 days' notice; changes never apply retroactively to a paid period.",
          ],
        },
        {
          heading: "Availability and support",
          body: [
            "We aim for high availability but the service is provided \"as is\" without a contractual SLA on self-serve plans. Current system state is published on our status page.",
          ],
        },
        {
          heading: "Liability",
          body: [
            "To the maximum extent permitted by law, ShelfReady's total liability for any claim is limited to the amounts you paid us in the twelve months before the claim arose. We are not liable for indirect or consequential damages, including lost profits or lost sales.",
          ],
        },
        {
          heading: "Termination",
          body: [
            "You can delete your account at any time. We may suspend or terminate accounts that break these terms, abuse the platform, or create risk for other tenants, with notice where practicable.",
          ],
        },
        {
          heading: "Changes",
          body: [
            "We may update these terms; material changes are announced by email or in the dashboard at least 14 days before they take effect. Continued use after that constitutes acceptance.",
          ],
        },
      ]}
    />
  );
}
