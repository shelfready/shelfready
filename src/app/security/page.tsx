import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Security",
  description: "How ShelfReady protects your catalog, credentials, and account.",
};

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      updated="July 18, 2026"
      intro="Every claim on this page describes something we actually run — no aspirational checkboxes."
      sections={[
        {
          heading: "Encryption",
          body: [
            "All traffic is served over TLS (Cloudflare at the edge, automatic certificate management at the origin).",
            "Connector credentials are encrypted at rest with AES-256-GCM and are never logged or sent to the browser. API keys are stored only as SHA-256 hashes and shown once at creation. Passwords are hashed with scrypt.",
          ],
        },
        {
          heading: "Tenant isolation",
          body: [
            "ShelfReady is multi-tenant by design: every tenant-owned table is accessed exclusively through merchant-scoped queries, and every change to tenant-scoped code ships with an automated isolation test proving one tenant cannot read or write another tenant's data.",
          ],
        },
        {
          heading: "Infrastructure",
          body: [
            "The platform runs on EU infrastructure (netcup, Germany) behind Cloudflare. Access to production is restricted to key-based SSH; password authentication is disabled.",
            "The database is backed up automatically on a rolling schedule.",
          ],
        },
        {
          heading: "Payments",
          body: [
            "Payments are processed by Stripe. Card data never touches our servers; webhook events are signature-verified and processed idempotently.",
          ],
        },
        {
          heading: "Integrations",
          body: [
            "Outbound webhooks are signed with HMAC-SHA256 so your systems can verify every delivery. We recommend read-only API credentials for store connectors — ShelfReady never needs write access to your store.",
          ],
        },
        {
          heading: "Reporting a vulnerability",
          body: [
            "Found something? Email support@useshelfready.com with details. We read every report, respond as fast as we can, and will credit you if you want. Please avoid accessing other tenants' data while testing.",
          ],
        },
      ]}
    />
  );
}
