import {
  MAX_AMOUNT_MINOR,
  transactionFormSchema,
} from "./transactionFormSchema.ts";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";
import { type z } from "zod";

const barack = "a0000000-0000-4000-8000-000000000001";
const donald = "a0000000-0000-4000-8000-000000000003";
const obamas = "c0000000-0000-4000-8000-000000000001";

const validInput: z.input<typeof transactionFormSchema> = {
  title: " Dinner ",
  description: "",
  amount: "100.00",
  currency: "EUR",
  transaction_date: "2026-11-04",
  paid_by: [`alias:${obamas}`, `member:${donald}`],
  paid_for: [`member:${barack}`, `member:${donald}`],
};

const issuesOf = (input: z.input<typeof transactionFormSchema>) =>
  transactionFormSchema.safeParse(input).error?.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

describe("transactionFormSchema", () => {
  it("gives the parameters of save_transaction", () => {
    expect(transactionFormSchema.parse(validInput)).toEqual({
      title: "Dinner",
      description: null,
      amount_minor: 10000n,
      currency: "EUR",
      transaction_date: Temporal.PlainDate.from("2026-11-04"),
      paid_by: [{ alias_id: obamas }, { member_id: donald }],
      paid_for: [{ member_id: barack }, { member_id: donald }],
    });
  });

  it("reads the amount with the decimals of the currency", () => {
    expect(
      transactionFormSchema.parse({
        ...validInput,
        amount: "1200",
        currency: "JPY",
      }).amount_minor,
    ).toBe(1200n);
    expect(
      transactionFormSchema.parse({ ...validInput, amount: 12.5 }).amount_minor,
    ).toBe(1250n);
    expect(
      issuesOf({ ...validInput, amount: "12.5", currency: "JPY" }),
    ).toEqual([
      {
        path: "amount",
        message: "The amount has too many decimals for the currency.",
      },
    ]);
  });

  it("refuses an amount that is not positive, not a number, or too large", () => {
    expect(issuesOf({ ...validInput, amount: "0" })).toEqual([
      { path: "amount", message: "Enter an amount larger than zero." },
    ]);
    expect(issuesOf({ ...validInput, amount: "-5" })).toEqual([
      { path: "amount", message: "Enter an amount, for example 12.50." },
    ]);
    expect(
      issuesOf({
        ...validInput,
        amount: `${(MAX_AMOUNT_MINOR + 1n).toString()}`,
        currency: "JPY",
      }),
    ).toEqual([{ path: "amount", message: "The amount is too large." }]);
  });

  it("refuses an empty title, a bad date, and an empty side", () => {
    expect(
      issuesOf({
        ...validInput,
        title: "  ",
        transaction_date: "2026-02-30",
        paid_for: [],
      }),
    ).toEqual([
      { path: "title", message: "Enter a title." },
      { path: "transaction_date", message: "Enter a date." },
      { path: "paid_for", message: "Select who the payment is for." },
    ]);
    expect(issuesOf({ ...validInput, transaction_date: null })).toEqual([
      { path: "transaction_date", message: "Enter a date." },
    ]);
  });

  it("refuses a party two times on one side, and a bad party value", () => {
    expect(
      issuesOf({
        ...validInput,
        paid_by: [`member:${donald}`, `member:${donald}`],
        paid_for: ["someone"],
      }),
    ).toEqual([
      { path: "paid_by", message: "Select each party one time only." },
      { path: "paid_for", message: "Select a party." },
    ]);
  });
});
