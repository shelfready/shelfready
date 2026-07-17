import { afterEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, sendEmail } from "./email";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SMTPFAST_API_KEY;
});

describe("sendEmail", () => {
  it("posts the Resend-compatible payload with the bearer key", async () => {
    process.env.SMTPFAST_API_KEY = "sf_test_key";
    let captured: { url: string; init: RequestInit } | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
        captured = { url: String(url), init: init! };
        return new Response(JSON.stringify({ id: "email_1" }), { status: 200 });
      }),
    );

    const result = await sendEmail({
      to: "kalin@example.com",
      subject: "Hello",
      text: "Hi",
    });
    expect(result.id).toBe("email_1");
    expect(captured!.url).toBe("https://smtpfa.st/api/v1/emails");
    const headers = captured!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sf_test_key");
    const body = JSON.parse(String(captured!.init.body));
    expect(body).toMatchObject({
      to: ["kalin@example.com"],
      subject: "Hello",
      text: "Hi",
    });
    expect(body.from).toContain("useshelfready.com");
  });

  it("throws on a non-2xx response with the status", async () => {
    process.env.SMTPFAST_API_KEY = "sf_test_key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("rate limit", { status: 429 })),
    );
    await expect(
      sendEmail({ to: "a@b.c", subject: "x", text: "y" }),
    ).rejects.toThrow(/429/);
  });

  it("throws without a key; emailConfigured reflects it", async () => {
    expect(emailConfigured()).toBe(false);
    await expect(
      sendEmail({ to: "a@b.c", subject: "x", text: "y" }),
    ).rejects.toThrow(/SMTPFAST_API_KEY/);
    process.env.SMTPFAST_API_KEY = "sf_test_key";
    expect(emailConfigured()).toBe(true);
  });
});
