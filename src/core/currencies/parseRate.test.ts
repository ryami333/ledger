import { formatRate } from "./formatRate.ts";
import { parseRate } from "./parseRate.ts";
import { describe, expect, it } from "vitest";

describe("parseRate", () => {
  it("gives the rate times 10^8", () => {
    expect(parseRate("1")).toBe(100000000n);
    expect(parseRate("0.92")).toBe(92000000n);
    expect(parseRate(".5")).toBe(50000000n);
    expect(parseRate("0.00000001")).toBe(1n);
    expect(parseRate("9999999999.99999999")).toBe(999999999999999999n);
  });

  it("reads the text of a numeric(18, 8) from PostgREST", () => {
    expect(parseRate("0.92000000")).toBe(92000000n);
    expect(parseRate("1.00000000")).toBe(100000000n);
  });

  it("refuses a text that numeric(18, 8) cannot hold or that is not positive", () => {
    for (const text of [
      "",
      ".",
      "0",
      "0.00000000",
      "-1",
      "1,5",
      "1e2",
      "0.000000001",
      "10000000000",
      "abc",
    ]) {
      expect(parseRate(text), text).toBeNull();
    }
  });
});

describe("formatRate", () => {
  it("writes the rate with no zeros at the end", () => {
    expect(formatRate(100000000n)).toBe("1");
    expect(formatRate(92000000n)).toBe("0.92");
    expect(formatRate(1n)).toBe("0.00000001");
    expect(formatRate(1250000000n)).toBe("12.5");
  });
});
