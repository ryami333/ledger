import { convertAmount } from "./convertAmount.ts";
import { parseRate } from "./parseRate.ts";
import { describe, expect, it } from "vitest";

const scaledRateOf = (text: string): bigint => {
  const scaledRate = parseRate(text);
  if (scaledRate === null) {
    throw new Error(`Bad rate ${text}`);
  }
  return scaledRate;
};

describe("convertAmount", () => {
  it("gives the same amount for the default currency", () => {
    expect(
      convertAmount({
        amountMinor: 1234n,
        currency: "EUR",
        scaledRate: scaledRateOf("1"),
        defaultCurrency: "EUR",
      }),
    ).toBe(1234n);
  });

  it("converts with the rate", () => {
    // $40.00 × 0.92 = €36.80
    expect(
      convertAmount({
        amountMinor: 4000n,
        currency: "USD",
        scaledRate: scaledRateOf("0.92"),
        defaultCurrency: "EUR",
      }),
    ).toBe(3680n);
  });

  it("rounds half away from zero to a whole minor unit", () => {
    // $0.50 × 0.93 = €0.465, thus €0.47
    expect(
      convertAmount({
        amountMinor: 50n,
        currency: "USD",
        scaledRate: scaledRateOf("0.93"),
        defaultCurrency: "EUR",
      }),
    ).toBe(47n);
    // $0.50 × 0.92 = €0.46, with no rounding
    expect(
      convertAmount({
        amountMinor: 50n,
        currency: "USD",
        scaledRate: scaledRateOf("0.92"),
        defaultCurrency: "EUR",
      }),
    ).toBe(46n);
    // $0.01 × 0.444 = €0.00444, thus €0.00
    expect(
      convertAmount({
        amountMinor: 1n,
        currency: "USD",
        scaledRate: scaledRateOf("0.444"),
        defaultCurrency: "EUR",
      }),
    ).toBe(0n);
  });

  it("converts from a currency with fewer decimals", () => {
    // ¥1,000 × 0.0061 = €6.10
    expect(
      convertAmount({
        amountMinor: 1000n,
        currency: "JPY",
        scaledRate: scaledRateOf("0.0061"),
        defaultCurrency: "EUR",
      }),
    ).toBe(610n);
  });

  it("converts from a currency with more decimals", () => {
    // KWD 1.234 × 2.98765 = €3.68676..., thus €3.69
    expect(
      convertAmount({
        amountMinor: 1234n,
        currency: "KWD",
        scaledRate: scaledRateOf("2.98765"),
        defaultCurrency: "EUR",
      }),
    ).toBe(369n);
    // €12.34 × 163.5 = ¥2,017.59, thus ¥2,018
    expect(
      convertAmount({
        amountMinor: 1234n,
        currency: "EUR",
        scaledRate: scaledRateOf("163.5"),
        defaultCurrency: "JPY",
      }),
    ).toBe(2018n);
  });
});
