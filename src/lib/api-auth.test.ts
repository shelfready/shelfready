import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  generateApiKey,
  hashApiKey,
  RATE_LIMIT,
  resetRateLimits,
} from "./api-auth";

describe("api key generation", () => {
  it("generates sr_-prefixed keys with matching hash and prefix", () => {
    const { key, hash, prefix } = generateApiKey();
    expect(key).toMatch(/^sr_[0-9a-f]{64}$/);
    expect(prefix).toBe(key.slice(0, 11));
    expect(hash).toBe(hashApiKey(key));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(key.slice(3, 20));
  });

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateApiKey().key));
    expect(keys.size).toBe(50);
  });
});

describe("rate limiting", () => {
  beforeEach(() => resetRateLimits());
  afterEach(() => resetRateLimits());

  it("allows up to the limit per window, then 429s with retry-after", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) {
      expect(checkRateLimit("key1", t0 + i).ok).toBe(true);
    }
    const denied = checkRateLimit("key1", t0 + RATE_LIMIT);
    expect(denied.ok).toBe(false);
    expect(denied.retryAfterSec).toBeGreaterThan(0);
  });

  it("window slides — old hits expire", () => {
    const t0 = 2_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) checkRateLimit("key2", t0);
    expect(checkRateLimit("key2", t0 + 1).ok).toBe(false);
    expect(checkRateLimit("key2", t0 + 61_000).ok).toBe(true);
  });

  it("keys are limited independently", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < RATE_LIMIT; i++) checkRateLimit("key3", t0);
    expect(checkRateLimit("key3", t0 + 1).ok).toBe(false);
    expect(checkRateLimit("key4", t0 + 1).ok).toBe(true);
  });
});
