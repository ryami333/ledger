import {
  convertCustomSplit,
  createEqualCustomSplit,
  customSplitFromShares,
  formatPercent,
  getSharePercent,
  resolveCustomSplit,
} from "./customSplitHelpers.ts";
import { describe, expect, it } from "vitest";

describe("resolveCustomSplit", () => {
  it("gives the remainder to the last party in the mode amount", () => {
    expect(
      resolveCustomSplit({
        split: { mode: "amount", values: ["40", "25.50"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 3,
      }),
    ).toEqual({ shares: [4000n, 2550n, 3450n] });
  });

  it("rounds each percentage share and gives the remainder to the last party", () => {
    expect(
      resolveCustomSplit({
        split: { mode: "percent", values: ["33.33", "33.33"] },
        amountMinor: 1001n,
        currency: "EUR",
        partyCount: 3,
      }),
    ).toEqual({ shares: [334n, 334n, 333n] });
    expect(
      resolveCustomSplit({
        split: { mode: "percent", values: ["40"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 2,
      }),
    ).toEqual({ shares: [4000n, 6000n] });
  });

  it("refuses a text that is not valid", () => {
    expect(
      resolveCustomSplit({
        split: { mode: "amount", values: ["12.345"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 2,
      }),
    ).toEqual({
      error:
        "Enter an amount for each party, with the decimals of the currency.",
    });
    expect(
      resolveCustomSplit({
        split: { mode: "percent", values: [""] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 2,
      }),
    ).toEqual({
      error: "Enter a percentage for each party, for example 40 or 12.5.",
    });
  });

  it("refuses a share of zero and a remainder of zero or less", () => {
    expect(
      resolveCustomSplit({
        split: { mode: "amount", values: ["0", "10"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 3,
      }),
    ).toEqual({ error: "Each share must be larger than zero." });
    expect(
      resolveCustomSplit({
        split: { mode: "percent", values: ["60", "40"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 3,
      }),
    ).toEqual({
      error: "The shares must leave a remainder for the last party.",
    });
    expect(
      resolveCustomSplit({
        split: { mode: "amount", values: ["120"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 2,
      }),
    ).toEqual({
      error: "The shares must leave a remainder for the last party.",
    });
  });

  it("refuses a split that does not agree with the parties", () => {
    expect(
      resolveCustomSplit({
        split: { mode: "amount", values: ["10"] },
        amountMinor: 10000n,
        currency: "EUR",
        partyCount: 3,
      }),
    ).toEqual({ error: "The custom split does not agree with the parties." });
  });
});

describe("convertCustomSplit", () => {
  it("converts amounts to percentages and back", () => {
    expect(
      convertCustomSplit({
        split: { mode: "amount", values: ["40", "", "12.5"] },
        amountMinor: 10000n,
        currency: "EUR",
      }),
    ).toEqual({ mode: "percent", values: ["40", "", "12.5"] });
    expect(
      convertCustomSplit({
        split: { mode: "percent", values: ["33.33", "x"] },
        amountMinor: 1000n,
        currency: "JPY",
      }),
    ).toEqual({ mode: "amount", values: ["333", ""] });
  });
});

describe("formatPercent and getSharePercent", () => {
  it("writes a percentage with no trailing zeros", () => {
    expect(formatPercent(4000n)).toBe("40");
    expect(formatPercent(1250n)).toBe("12.5");
    expect(formatPercent(3333n)).toBe("33.33");
    expect(formatPercent(0n)).toBe("0");
    expect(getSharePercent({ shareMinor: 1n, amountMinor: 3n })).toBe("33.33");
  });
});

describe("createEqualCustomSplit and customSplitFromShares", () => {
  it("gives an equal split in percent", () => {
    expect(createEqualCustomSplit(2)).toEqual({
      mode: "percent",
      values: ["50"],
    });
    expect(createEqualCustomSplit(3)).toEqual({
      mode: "percent",
      values: ["33.33", "33.33"],
    });
  });

  it("gives the saved shares without the last share", () => {
    expect(
      customSplitFromShares({ shares: [4000n, 6000n], currency: "EUR" }),
    ).toEqual({ mode: "amount", values: ["40.00"] });
  });
});
