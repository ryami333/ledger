import { describe, expect, it } from "vitest";
import { isCurrencyCode } from "./isCurrencyCode.ts";

describe("isCurrencyCode", () => {
  it("accepts three capital letters", () => {
    expect(isCurrencyCode("EUR")).toBe(true);
  });

  it("refuses lowercase letters, other lengths, and digits", () => {
    expect(isCurrencyCode("eur")).toBe(false);
    expect(isCurrencyCode("EURO")).toBe(false);
    expect(isCurrencyCode("E1R")).toBe(false);
  });
});
