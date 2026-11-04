import { getCurrencyDecimals } from "./getCurrencyDecimals.ts";
import { describe, expect, it } from "vitest";

describe("getCurrencyDecimals", () => {
  it("gives the decimals of currencies with 0, 2, and 3 decimals", () => {
    expect(getCurrencyDecimals("JPY")).toBe(0);
    expect(getCurrencyDecimals("EUR")).toBe(2);
    expect(getCurrencyDecimals("KWD")).toBe(3);
  });
});
