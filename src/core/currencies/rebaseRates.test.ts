import { rebaseRates } from "./rebaseRates.ts";
import { describe, expect, it } from "vitest";

describe("rebaseRates", () => {
  it("gives each rate relative to the new default currency", () => {
    expect(
      rebaseRates({
        currencies: [
          { currency: "EUR", rate: "1", is_default: true },
          { currency: "USD", rate: "0.92", is_default: false },
          { currency: "GBP", rate: "1.15", is_default: false },
        ],
        defaultCurrency: "USD",
      }),
    ).toEqual([
      // 1 / 0.92 = 1.0869565217..., rounded to 8 decimals
      { currency: "EUR", rate: "1.08695652", is_default: false },
      { currency: "USD", rate: "1", is_default: true },
      // 1.15 / 0.92 = 1.25
      { currency: "GBP", rate: "1.25", is_default: false },
    ]);
  });

  it("rounds half away from zero to 8 decimals", () => {
    // 0.00000001 / 2 = 0.000000005, thus 0.00000001
    expect(
      rebaseRates({
        currencies: [
          { currency: "EUR", rate: "2", is_default: false },
          { currency: "USD", rate: "0.00000001", is_default: false },
        ],
        defaultCurrency: "EUR",
      }),
    ).toEqual([
      { currency: "EUR", rate: "1", is_default: true },
      { currency: "USD", rate: "0.00000001", is_default: false },
    ]);
  });

  it("gives the old rates again after a change back", () => {
    const currencies = [
      { currency: "EUR", rate: "1", is_default: true },
      { currency: "USD", rate: "0.8", is_default: false },
    ];
    const rebased = rebaseRates({ currencies, defaultCurrency: "USD" });
    expect(rebased).not.toBeNull();
    expect(
      rebaseRates({ currencies: rebased ?? [], defaultCurrency: "EUR" }),
    ).toEqual(currencies);
  });

  it("keeps a rate text that is not valid", () => {
    expect(
      rebaseRates({
        currencies: [
          { currency: "EUR", rate: "1", is_default: true },
          { currency: "USD", rate: "2", is_default: false },
          { currency: "GBP", rate: "abc", is_default: false },
        ],
        defaultCurrency: "USD",
      }),
    ).toEqual([
      { currency: "EUR", rate: "0.5", is_default: false },
      { currency: "USD", rate: "1", is_default: true },
      { currency: "GBP", rate: "abc", is_default: false },
    ]);
  });

  it("gives null for a new default currency with no valid rate", () => {
    const currencies = [
      { currency: "EUR", rate: "1", is_default: true },
      { currency: "USD", rate: "", is_default: false },
    ];
    expect(rebaseRates({ currencies, defaultCurrency: "USD" })).toBeNull();
    expect(rebaseRates({ currencies, defaultCurrency: "GBP" })).toBeNull();
  });
});
