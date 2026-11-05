import { parseDecimalText } from "./parseDecimalText.ts";
import { describe, expect, it } from "vitest";

describe("parseDecimalText", () => {
  it("reads a number with the implied decimals", () => {
    expect(parseDecimalText({ text: "40", decimals: 2 })).toBe(4000n);
    expect(parseDecimalText({ text: " 33.33 ", decimals: 2 })).toBe(3333n);
    expect(parseDecimalText({ text: ".5", decimals: 2 })).toBe(50n);
    expect(parseDecimalText({ text: "7.", decimals: 0 })).toBe(7n);
  });

  it("refuses a text that is not a positive number with the decimals", () => {
    expect(parseDecimalText({ text: "", decimals: 2 })).toBeNull();
    expect(parseDecimalText({ text: ".", decimals: 2 })).toBeNull();
    expect(parseDecimalText({ text: "-1", decimals: 2 })).toBeNull();
    expect(parseDecimalText({ text: "1.234", decimals: 2 })).toBeNull();
    expect(parseDecimalText({ text: "1,5", decimals: 2 })).toBeNull();
  });
});
