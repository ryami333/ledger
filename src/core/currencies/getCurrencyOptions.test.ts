import { getCurrencyOptions } from "./getCurrencyOptions.ts";
import { describe, expect, it } from "vitest";

describe("getCurrencyOptions", () => {
  it("gives the code and the name of each currency, sorted by code", () => {
    const options = getCurrencyOptions("en-IE");
    expect(options).toContainEqual({ value: "EUR", label: "EUR · Euro" });
    const values = options.map((option) => option.value);
    expect(values).toEqual(values.toSorted());
  });
});
