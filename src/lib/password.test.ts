import { describe, expect, it } from "vitest";
import { hashPassword, passwordPolicyError, verifyPassword } from "./password";

describe("password hashing", () => {
  it("round-trips and rejects wrong passwords", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^scrypt\$\d+\$/);
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password entirely", hash)).toBe(false);
  });

  it("produces unique salts", async () => {
    const a = await hashPassword("same password here");
    const b = await hashPassword("same password here");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same password here", a)).toBe(true);
    expect(await verifyPassword("same password here", b)).toBe(true);
  });

  it("rejects malformed or tampered stored hashes", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "scrypt$999999999999$a$b")).toBe(false);
    const hash = await hashPassword("some password ok");
    const tampered = hash.slice(0, -4) + "AAAA";
    expect(await verifyPassword("some password ok", tampered)).toBe(false);
  });

  it("enforces the length policy", () => {
    expect(passwordPolicyError("short")).toContain("10 characters");
    expect(passwordPolicyError("long enough password")).toBeNull();
    expect(passwordPolicyError("x".repeat(200))).toContain("too long");
  });
});
