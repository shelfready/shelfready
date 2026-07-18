import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ShelfReady collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 18, 2026"
      intro="ShelfReady (useshelfready.com) helps independent stores publish product feeds for AI shopping surfaces. This policy explains what we collect, why, and the choices you have."
      sections={[
        {
          heading: "Information we collect",
          body: [
            "Account information: your email address, name, and a password hash (we never store your password itself) or your OAuth identity if you sign in with a supported provider.",
            "Catalog data you connect or upload: product titles, descriptions, prices, identifiers (GTIN/MPN), images URLs, and availability. We process it to run audits, generate feeds, draft enrichment proposals, and monitor freshness.",
            "Connector credentials (e.g. a read-only WooCommerce key) are encrypted at rest with AES-256-GCM and are never shown again after you save them, never logged, and never sent to your browser.",
            "Operational logs: request metadata (IP address, user agent, timestamps) kept for security and debugging. Our analytics are self-hosted (umami) and cookie-free; we do not use third-party advertising trackers.",
          ],
        },
        {
          heading: "How we use information",
          body: [
            "To provide the service: syncing catalogs, scoring audits, rendering feeds, running enrichment you request, and sending you the alerts and emails you enable.",
            "To bill paid plans through Stripe. Card details go directly to Stripe; we never see or store them.",
            "We do not sell your data, and we do not use your catalog to train AI models.",
          ],
        },
        {
          heading: "Subprocessors",
          body: [
            "We use a small set of infrastructure providers to run ShelfReady: netcup (hosting, Germany/EU), Cloudflare (DNS, CDN, and object storage), Stripe (payments), SMTPfast (transactional email), Anthropic (Claude API — only for catalogs you explicitly run enrichment on), and Google (optional sign-in only).",
            "Each subprocessor receives only what its function requires.",
          ],
        },
        {
          heading: "Data retention and deletion",
          body: [
            "Your data is retained while your account is active. Deleting a source removes its synced products; deleting your account removes your merchant workspace, catalog, findings, and credentials.",
            "Encrypted database backups are kept on a rolling window and expire automatically.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can access, correct, export, or delete your data at any time — most of it directly in the dashboard, and anything else by emailing support@useshelfready.com. If you are in the EU/EEA, you may also lodge a complaint with your local supervisory authority.",
          ],
        },
      ]}
    />
  );
}
