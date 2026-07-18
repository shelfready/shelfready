import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "./form";

export const metadata = { title: "Reset password — ShelfReady" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  return (
    <AuthShell>
      <ResetForm token={token ?? null} email={email ?? null} />
    </AuthShell>
  );
}
