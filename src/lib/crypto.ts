import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * Connector-credential encryption at rest (CLAUDE.md hard rule).
 * AES-256-GCM with a key from CREDENTIALS_KEY (64 hex chars = 32 bytes).
 * Wire format: base64(iv).base64(authTag).base64(ciphertext).
 */
function key(): Buffer {
  const hex = process.env.CREDENTIALS_KEY;
  if (!hex || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("CREDENTIALS_KEY must be 64 hex chars (openssl rand -hex 32)");
  }
  return Buffer.from(hex, "hex");
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(".");
}

export function decryptJson<T = unknown>(payload: string): T {
  const [iv, tag, ciphertext] = payload
    .split(".")
    .map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString("utf8")) as T;
}
