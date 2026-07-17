import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptJson, encryptJson } from "./crypto";

const KEY = "a".repeat(64);

beforeEach(() => {
  process.env.CREDENTIALS_KEY = KEY;
});

afterEach(() => {
  delete process.env.CREDENTIALS_KEY;
});

describe("credential crypto", () => {
  it("round-trips JSON", () => {
    const value = { consumerKey: "ck_123", consumerSecret: "cs_456" };
    const payload = encryptJson(value);
    expect(payload).not.toContain("ck_123");
    expect(decryptJson(payload)).toEqual(value);
  });

  it("produces distinct ciphertexts per call (fresh IV)", () => {
    expect(encryptJson({ a: 1 })).not.toBe(encryptJson({ a: 1 }));
  });

  it("rejects tampered ciphertext", () => {
    const payload = encryptJson({ a: 1 });
    const parts = payload.split(".");
    const cipher = Buffer.from(parts[2], "base64");
    cipher[0] ^= 0xff;
    parts[2] = cipher.toString("base64");
    expect(() => decryptJson(parts.join("."))).toThrow();
  });

  it("refuses to run without a proper key", () => {
    process.env.CREDENTIALS_KEY = "too-short";
    expect(() => encryptJson({})).toThrow(/CREDENTIALS_KEY/);
    delete process.env.CREDENTIALS_KEY;
    expect(() => encryptJson({})).toThrow(/CREDENTIALS_KEY/);
  });
});
