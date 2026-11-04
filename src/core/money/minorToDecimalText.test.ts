import { minorToDecimalText } from "./minorToDecimalText.ts";
import { describe, expect, it } from "vitest";

describe("minorToDecimalText", () => {
  it("writes the decimal point at the position of the decimals", () => {
    expect(minorToDecimalText({ amountMinor: 1250n, decimals: 2 })).toBe(
      "12.50",
    );
    expect(minorToDecimalText({ amountMinor: 5n, decimals: 3 })).toBe("0.005");
    expect(minorToDecimalText({ amountMinor: 1200n, decimals: 0 })).toBe(
      "1200",
    );
  });

  it("writes a negative amount with a minus sign", () => {
    expect(minorToDecimalText({ amountMinor: -7n, decimals: 2 })).toBe("-0.07");
  });
});
