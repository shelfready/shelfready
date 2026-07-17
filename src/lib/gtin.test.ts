import { describe, expect, it } from "vitest";
import { isValidGtin } from "./gtin";

describe("isValidGtin", () => {
  it("accepts valid GTINs of every allowed length", () => {
    expect(isValidGtin("96385074")).toBe(true); // GTIN-8
    expect(isValidGtin("036000291452")).toBe(true); // GTIN-12 (UPC-A)
    expect(isValidGtin("4006381333931")).toBe(true); // GTIN-13 (EAN)
    expect(isValidGtin("00012345600012")).toBe(true); // GTIN-14
  });

  it("rejects a wrong check digit", () => {
    expect(isValidGtin("4006381333932")).toBe(false);
  });

  it("rejects wrong lengths and non-numeric input", () => {
    expect(isValidGtin("1234567")).toBe(false); // 7 digits
    expect(isValidGtin("12345678901")).toBe(false); // 11 digits
    expect(isValidGtin("40063813339x1")).toBe(false);
    expect(isValidGtin("")).toBe(false);
  });
});
