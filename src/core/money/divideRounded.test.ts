import { divideRounded } from "./divideRounded.ts";
import { describe, expect, it } from "vitest";

describe("divideRounded", () => {
  it("rounds half away from zero", () => {
    expect(divideRounded({ dividend: 5n, divisor: 2n })).toBe(3n);
    expect(divideRounded({ dividend: -5n, divisor: 2n })).toBe(-3n);
    expect(divideRounded({ dividend: 5n, divisor: -2n })).toBe(-3n);
  });

  it("rounds to the nearest integer", () => {
    expect(divideRounded({ dividend: 14n, divisor: 10n })).toBe(1n);
    expect(divideRounded({ dividend: 16n, divisor: 10n })).toBe(2n);
    expect(divideRounded({ dividend: -14n, divisor: 10n })).toBe(-1n);
    expect(divideRounded({ dividend: 20n, divisor: 10n })).toBe(2n);
  });

  it("refuses a divisor of zero", () => {
    expect(() => divideRounded({ dividend: 1n, divisor: 0n })).toThrow(
      "divideRounded cannot divide by zero",
    );
  });
});
