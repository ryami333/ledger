import { isSupportedCurrency } from "./isSupportedCurrency.ts";
import { describe, expect, it } from "vitest";

describe("isSupportedCurrency", () => {
  it("accepts a currency that Intl knows", () => {
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("JPY")).toBe(true);
    expect(isSupportedCurrency("KWD")).toBe(true);
  });

  it("refuses a code that Intl does not know, and a bad code", () => {
    expect(isSupportedCurrency("ABC")).toBe(false);
    expect(isSupportedCurrency("eur")).toBe(false);
  });
});
