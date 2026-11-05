import { parseAmountSearchText } from "./parseAmountSearchText.ts";
import { describe, expect, it } from "vitest";

describe("parseAmountSearchText", () => {
  it("accepts a point or a comma as the decimal separator", () => {
    expect(parseAmountSearchText("44.76")).toEqual(["44.76"]);
    expect(parseAmountSearchText("44,76")).toEqual(["44.76"]);
    expect(parseAmountSearchText(" 44,7 ")).toEqual(["44.7"]);
    expect(parseAmountSearchText(",5")).toEqual([".5"]);
  });

  it("removes the thousands separator", () => {
    expect(parseAmountSearchText("1,234.56")).toEqual(["1234.56"]);
    expect(parseAmountSearchText("1.234,56")).toEqual(["1234.56"]);
    expect(parseAmountSearchText("1 234,56")).toEqual(["1234.56"]);
    expect(parseAmountSearchText("1'234.56")).toEqual(["1234.56"]);
    expect(parseAmountSearchText("1.234.567")).toEqual(["1234567"]);
    expect(parseAmountSearchText("1,234,567.8")).toEqual(["1234567.8"]);
  });

  it("gives two amounts for one separator before three digits", () => {
    expect(parseAmountSearchText("1,234")).toEqual(["1.234", "1234"]);
    expect(parseAmountSearchText("1.234")).toEqual(["1.234", "1234"]);
  });

  it("ignores a currency symbol", () => {
    expect(parseAmountSearchText("€44,76")).toEqual(["44.76"]);
    expect(parseAmountSearchText("40 $")).toEqual(["40"]);
  });

  it("refuses a text that is not an amount", () => {
    expect(parseAmountSearchText("")).toEqual([]);
    expect(parseAmountSearchText("dinner")).toEqual([]);
    expect(parseAmountSearchText("room 12")).toEqual([]);
    expect(parseAmountSearchText("-12")).toEqual([]);
    expect(parseAmountSearchText(".,")).toEqual([]);
    expect(parseAmountSearchText("1.2.3,4.5")).toEqual([]);
    expect(parseAmountSearchText("1,2.3,4")).toEqual([]);
  });
});
