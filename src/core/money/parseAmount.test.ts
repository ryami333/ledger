import { parseAmount } from "./parseAmount.ts";
import { describe, expect, it } from "vitest";

describe("parseAmount", () => {
  it("parses an amount in a currency with 2 decimals", () => {
    expect(parseAmount({ text: "12.50", currency: "EUR" })).toBe(1250n);
    expect(parseAmount({ text: "12.5", currency: "EUR" })).toBe(1250n);
    expect(parseAmount({ text: "12", currency: "EUR" })).toBe(1200n);
    expect(parseAmount({ text: "12.", currency: "EUR" })).toBe(1200n);
    expect(parseAmount({ text: ".05", currency: "EUR" })).toBe(5n);
    expect(parseAmount({ text: " 0.10 ", currency: "EUR" })).toBe(10n);
  });

  it("parses an amount in a currency with 0 decimals", () => {
    expect(parseAmount({ text: "1200", currency: "JPY" })).toBe(1200n);
    expect(parseAmount({ text: "1200.", currency: "JPY" })).toBe(1200n);
    expect(parseAmount({ text: "1200.5", currency: "JPY" })).toBeNull();
  });

  it("parses an amount in a currency with 3 decimals", () => {
    expect(parseAmount({ text: "1.234", currency: "KWD" })).toBe(1234n);
    expect(parseAmount({ text: "1.2", currency: "KWD" })).toBe(1200n);
    expect(parseAmount({ text: "1.2345", currency: "KWD" })).toBeNull();
  });

  it("keeps all digits of a large amount", () => {
    expect(parseAmount({ text: "90071992547409.93", currency: "EUR" })).toBe(
      9007199254740993n,
    );
  });

  it("gives zero for a zero amount", () => {
    expect(parseAmount({ text: "0.00", currency: "EUR" })).toBe(0n);
  });

  it("refuses a text that is not a positive amount", () => {
    for (const text of [
      "",
      " ",
      ".",
      "-1",
      "+1",
      "1,50",
      "1,000.00",
      "1e3",
      "12.345",
      "abc",
      "1.2.3",
    ]) {
      expect(parseAmount({ text, currency: "EUR" }), text).toBeNull();
    }
  });
});
