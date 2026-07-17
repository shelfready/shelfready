import { requireMerchant } from "@/lib/require-merchant";

export default async function DashboardPage() {
  const { session, merchant } = await requireMerchant();

  return (
    <main style={{ padding: "48px 24px", maxWidth: 800, margin: "0 auto" }}>
      <h1>{merchant.name}</h1>
      <p>
        Signed in as {session.user?.email} · role: {merchant.role}
      </p>
      <p>
        Catalog, sources, and feeds land here as M1/M2 ship. For now this
        page proves auth + tenancy: you are scoped to merchant{" "}
        <code>{merchant.slug}</code>.
      </p>
    </main>
  );
}
