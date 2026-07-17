import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Password hashing with node:crypto scrypt (N=2^15, r=8, p=1) — zero
 * dependencies, constant-time comparison. Format: scrypt$N$salt$hash
 * (base64), so parameters can be raised later without breaking old
 * hashes.
 */
const KEYLEN = 64;
const COST = 2 ** 15;

function scryptAsync(password: string, salt: Buffer, cost: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, { N: cost, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, COST);
  return `scrypt$${COST}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const cost = Number(parts[1]);
  if (!Number.isInteger(cost) || cost < 2 ** 12 || cost > 2 ** 20) return false;
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  const actual = await scryptAsync(password, salt, cost);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 128) return "Password is too long.";
  return null;
}
