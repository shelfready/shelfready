/**
 * GTIN (8/12/13/14-digit) validation per GS1: numeric, allowed length,
 * and a mod-10 check digit computed over the leading digits with 3/1
 * weights from the right.
 *
 * This is the #1 agent-readiness audit check — ~60% of long-tail catalogs
 * carry missing or invalid GTINs, and AI shopping surfaces key on them.
 */
const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function isValidGtin(value: string): boolean {
  if (!/^\d+$/.test(value) || !GTIN_LENGTHS.has(value.length)) return false;
  const digits = value.split("").map(Number);
  const check = digits.pop() as number;
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
