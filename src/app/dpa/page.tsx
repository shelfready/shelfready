import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Data Processing Addendum",
  description: "Data processing terms for merchants using ShelfReady.",
};

export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Addendum"
      updated="July 18, 2026"
      intro="This addendum applies where ShelfReady processes personal data contained in your catalog or account on your behalf, and forms part of our Terms of Service."
      sections={[
        {
          heading: "Roles",
          body: [
            "You (the merchant) are the data controller for personal data in your catalog and store data. ShelfReady acts as a processor, processing that data only to provide the service described in the Terms.",
          ],
        },
        {
          heading: "Scope of processing",
          body: [
            "Processing covers syncing catalog data from your connected sources, auditing and scoring it, rendering feeds, generating enrichment proposals you request, monitoring freshness, and delivering webhooks and emails you configure. Product catalogs typically contain little personal data; account data covers your team's emails and names.",
          ],
        },
        {
          heading: "Subprocessors",
          body: [
            "Current subprocessors: netcup (EU hosting), Cloudflare (network and storage), Stripe (billing), SMTPfast (email), Anthropic (AI enrichment, only when you run it), Google (optional sign-in). We will inform account owners before adding a subprocessor that materially changes how data is handled.",
          ],
        },
        {
          heading: "Security measures",
          body: [
            "The measures on our Security page apply: TLS in transit, AES-256-GCM for stored credentials, hashed keys and passwords, enforced and tested tenant isolation, EU hosting, and automated backups.",
          ],
        },
        {
          heading: "Data subject requests and incidents",
          body: [
            "We assist you with access and deletion requests that reach us directly by referring them to you, or by acting on your instruction. We will notify you without undue delay after becoming aware of a personal data breach affecting your data.",
          ],
        },
        {
          heading: "Deletion",
          body: [
            "On termination of your account, personal data processed on your behalf is deleted, with residual copies in encrypted backups expiring on the backup rotation schedule.",
          ],
        },
      ]}
    />
  );
}
