import { transactionFormSchema } from "../forms/transactionFormSchema.ts";
import {
  type McpTransactionValues,
  buildTransactionFormInput,
  toFormSplit,
} from "./buildTransactionFormInput.ts";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

const barackId = "00000000-0000-0000-0000-000000000001";
const donaldId = "00000000-0000-0000-0000-000000000003";

const dinner: McpTransactionValues = {
  title: "Dinner",
  description: null,
  amount: "90",
  currency: "EUR",
  rate: "1",
  transactionDate: "2026-11-07",
  paidBy: [{ member_id: barackId }],
  paidFor: [{ member_id: barackId }, { member_id: donaldId }],
  paidBySplit: null,
  paidForSplit: null,
};

describe("buildTransactionFormInput", () => {
  it("gives a form input that the form schema accepts", () => {
    const input = buildTransactionFormInput(dinner);
    expect(input).not.toHaveProperty("error");
    const parsed = transactionFormSchema.parse(input);
    expect(parsed).toEqual({
      title: "Dinner",
      description: null,
      amount_minor: 9000n,
      currency: "EUR",
      rate: "1",
      transaction_date: Temporal.PlainDate.from("2026-11-07"),
      paid_by: [{ member_id: barackId, share_minor: null }],
      paid_for: [
        { member_id: barackId, share_minor: null },
        { member_id: donaldId, share_minor: null },
      ],
    });
  });

  it("gives the custom shares of a split", () => {
    const input = buildTransactionFormInput({
      ...dinner,
      paidForSplit: { mode: "percent", values: ["60", "40"] },
    });
    const parsed = transactionFormSchema.parse(input);
    expect(parsed.paid_for).toEqual([
      { member_id: barackId, share_minor: 5400n },
      { member_id: donaldId, share_minor: 3600n },
    ]);
  });

  it("gives the error of a split that does not agree", () => {
    expect(
      buildTransactionFormInput({
        ...dinner,
        paidForSplit: { mode: "amount", values: ["50", "30"] },
      }),
    ).toEqual({ error: expect.stringContaining("must sum to the amount") });
  });
});

describe("toFormSplit", () => {
  const base = {
    partyCount: 2,
    amountText: "90.00",
    currency: "EUR",
    side: "paid_for",
  };

  it("gives null for an equal split", () => {
    expect(toFormSplit({ ...base, split: null })).toEqual({ split: null });
  });

  it("keeps all values except the last", () => {
    expect(
      toFormSplit({ ...base, split: { mode: "amount", values: ["50", "40"] } }),
    ).toEqual({ split: { mode: "amount", values: ["50"] } });
  });

  it("refuses a wrong number of values", () => {
    expect(
      toFormSplit({ ...base, split: { mode: "amount", values: ["90"] } }),
    ).toEqual({ error: expect.stringContaining("has 1 values") });
  });

  it("refuses percentages that do not sum to 100", () => {
    expect(
      toFormSplit({
        ...base,
        split: { mode: "percent", values: ["50", "40"] },
      }),
    ).toEqual({ error: expect.stringContaining("100 percent") });
  });

  it("refuses a value that is not a number", () => {
    expect(
      toFormSplit({
        ...base,
        split: { mode: "amount", values: ["fifty", "40"] },
      }),
    ).toEqual({ error: expect.stringContaining("must be a number") });
  });
});
