import { currencyFormSchema } from "./currencyFormSchema.ts";
import { describe, expect, it } from "vitest";
import { type z } from "zod";

const issuesOf = (input: z.input<typeof currencyFormSchema>) =>
  currencyFormSchema.safeParse(input).error?.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

describe("currencyFormSchema", () => {
  it("gives the jsonb array of save_space_currencies", () => {
    expect(
      currencyFormSchema.parse({
        currencies: [
          { currency: "EUR", rate: "1.00000000", is_default: true },
          { currency: "USD", rate: " 0.920 ", is_default: false },
        ],
      }),
    ).toEqual({
      currencies: [
        { currency: "EUR", rate: "1", is_default: true },
        { currency: "USD", rate: "0.92", is_default: false },
      ],
    });
  });

  it("refuses a rate that is not valid, and a default rate that is not 1", () => {
    expect(
      issuesOf({
        currencies: [
          { currency: "EUR", rate: "2", is_default: true },
          { currency: "USD", rate: "0", is_default: false },
        ],
      }),
    ).toEqual([
      {
        path: "currencies.0.rate",
        message: "The rate of the default currency is 1.",
      },
      {
        path: "currencies.1.rate",
        message: "Enter a rate larger than zero, with 8 decimals or fewer.",
      },
    ]);
  });

  it("refuses zero or two default currencies", () => {
    expect(
      issuesOf({
        currencies: [{ currency: "EUR", rate: "1", is_default: false }],
      }),
    ).toEqual([
      { path: "currencies", message: "Select exactly one default currency." },
    ]);
    expect(
      issuesOf({
        currencies: [
          { currency: "EUR", rate: "1", is_default: true },
          { currency: "USD", rate: "1", is_default: true },
        ],
      }),
    ).toEqual([
      { path: "currencies", message: "Select exactly one default currency." },
    ]);
  });

  it("refuses a currency two times, and an unknown currency", () => {
    expect(
      issuesOf({
        currencies: [
          { currency: "EUR", rate: "1", is_default: true },
          { currency: "EUR", rate: "1", is_default: false },
        ],
      }),
    ).toEqual([
      {
        path: "currencies.1.currency",
        message: "The list has this currency already.",
      },
    ]);
    expect(
      issuesOf({
        currencies: [{ currency: "ABC", rate: "1", is_default: true }],
      }),
    ).toEqual([
      { path: "currencies.0.currency", message: "Select a currency." },
    ]);
  });
});
