import { formatAmount } from "./formatAmount.ts";
import { describe, expect, it } from "vitest";

const locale = "en-IE";

describe("formatAmount", () => {
  it("formats an amount in a currency with 2 decimals", () => {
    expect(formatAmount({ amountMinor: 2500n, currency: "EUR", locale })).toBe(
      "€25.00",
    );
    expect(formatAmount({ amountMinor: 5n, currency: "EUR", locale })).toBe(
      "€0.05",
    );
  });

  it("formats an amount in a currency with 0 decimals", () => {
    expect(formatAmount({ amountMinor: 1200n, currency: "JPY", locale })).toBe(
      "JP¥1,200",
    );
  });

  it("formats an amount in a currency with 3 decimals", () => {
    expect(formatAmount({ amountMinor: 1234n, currency: "KWD", locale })).toBe(
      "KWD\u00a01.234",
    );
  });

  it("formats a negative amount", () => {
    expect(formatAmount({ amountMinor: -2500n, currency: "EUR", locale })).toBe(
      "-€25.00",
    );
  });

  it("keeps all digits of a large amount", () => {
    expect(
      formatAmount({ amountMinor: 9007199254740993n, currency: "EUR", locale }),
    ).toBe("€90,071,992,547,409.93");
  });
});
