/**
 * Transactional email via SMTPfast's Resend-compatible REST API
 * (POST /v1/emails, Bearer key). Used for auth magic links now and M5
 * alert emails later. Domain + key are provisioned in infra/email/.
 */
const API_URL = "https://smtpfa.st/api/v1/emails";
const FROM = "ShelfReady <login@useshelfready.com>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.SMTPFAST_API_KEY);
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string }> {
  const key = process.env.SMTPFAST_API_KEY;
  if (!key) throw new Error("SMTPFAST_API_KEY is not set");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`smtpfast: HTTP ${res.status} ${detail}`.trim());
  }
  return (await res.json()) as { id: string };
}
