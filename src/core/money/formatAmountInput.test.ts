import { formatAmountInput } from "./formatAmountInput.ts";
import { parseAmount } from "./parseAmount.ts";
import { describe, expect, it } from "vitest";

describe("formatAmountInput", () => {
  it("writes the text that parseAmount reads back", () => {
    for (const [amountMinor, currency, text] of [
      [1250n, "EUR", "12.50"],
      [1200n, "JPY", "1200"],
      [1234n, "KWD", "1.234"],
    ] as const) {
      expect(formatAmountInput({ amountMinor, currency })).toBe(text);
      expect(parseAmount({ text, currency })).toBe(amountMinor);
    }
  });
});
