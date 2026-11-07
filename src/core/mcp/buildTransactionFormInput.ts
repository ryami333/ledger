import type { transactionFormSchema } from "../forms/transactionFormSchema.ts";
import { parseAmount } from "../money/parseAmount.ts";
import { parseDecimalText } from "../money/parseDecimalText.ts";
import type { CustomSplit } from "../splits/customSplitHelpers.ts";
import {
  type PartyReference,
  toPartyRow,
  toPartyValue,
} from "../transactions/partyValueHelpers.ts";
import type { z } from "zod";

/**
 * The custom split of one side in an MCP tool call (PLAN.md, D6 and D15).
 * Unlike the form, `values` has one text for each party, the last party
 * too. Thus the client must give a total that agrees.
 */
export type McpSplit = { mode: "amount" | "percent"; values: string[] };

/** 100% in basis points. A percentage has up to 2 decimals. */
const FULL_PERCENT = 10000n;

/**
 * Converts the custom split of a tool call to the custom split of the
 * transaction form: all values except the last. It checks that the values
 * sum to the amount, or to 100%. Returns null for an equal split.
 */
export const toFormSplit = ({
  split,
  partyCount,
  amountText,
  currency,
  side,
}: {
  split: McpSplit | null;
  partyCount: number;
  amountText: string;
  currency: string;
  side: string;
}): { split: CustomSplit | null } | { error: string } => {
  if (split === null) return { split: null };
  if (split.values.length !== partyCount) {
    return {
      error: `The split of ${side} has ${split.values.length} values, but ${side} has ${partyCount} parties. Give one value for each party, in the same order.`,
    };
  }
  if (partyCount < 2) {
    return { error: `A split of ${side} needs two or more parties.` };
  }
  const parseValue = (text: string) =>
    split.mode === "amount"
      ? parseAmount({ text, currency })
      : parseDecimalText({ text, decimals: 2 });
  const parsedValues = split.values.map(parseValue);
  if (parsedValues.some((value) => value === null)) {
    return {
      error: `Each value of the split of ${side} must be a number, for example "12.50".`,
    };
  }
  const total = parsedValues.reduce<bigint>(
    (accumulator, value) => accumulator + (value ?? 0n),
    0n,
  );
  const expectedTotal =
    split.mode === "amount"
      ? parseAmount({ text: amountText, currency })
      : FULL_PERCENT;
  if (total !== expectedTotal) {
    return {
      error:
        split.mode === "amount"
          ? `The split of ${side} must sum to the amount, ${amountText} ${currency}.`
          : `The split of ${side} must sum to 100 percent.`,
    };
  }
  return { split: { mode: split.mode, values: split.values.slice(0, -1) } };
};

/**
 * The values of a transaction for an MCP tool call, after the names are
 * resolved. `rate` is the transaction rate (PLAN.md, D5).
 */
export type McpTransactionValues = {
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  rate: string;
  transactionDate: string;
  paidBy: readonly PartyReference[];
  paidFor: readonly PartyReference[];
  paidBySplit: McpSplit | null;
  paidForSplit: McpSplit | null;
};

/**
 * Converts the values of an MCP tool call to the input of the transaction
 * form schema. The tool then parses it with the same schema as the form.
 */
export const buildTransactionFormInput = (
  values: McpTransactionValues,
): z.input<typeof transactionFormSchema> | { error: string } => {
  const paidBySplit = toFormSplit({
    split: values.paidBySplit,
    partyCount: values.paidBy.length,
    amountText: values.amount,
    currency: values.currency,
    side: "paid_by",
  });
  if ("error" in paidBySplit) return paidBySplit;
  const paidForSplit = toFormSplit({
    split: values.paidForSplit,
    partyCount: values.paidFor.length,
    amountText: values.amount,
    currency: values.currency,
    side: "paid_for",
  });
  if ("error" in paidForSplit) return paidForSplit;
  return {
    title: values.title,
    description: values.description,
    amount: values.amount,
    currency: values.currency,
    rate: values.rate,
    transaction_date: values.transactionDate,
    paid_by: values.paidBy.map((party) => toPartyValue(toPartyRow(party))),
    paid_by_split: paidBySplit.split,
    paid_for: values.paidFor.map((party) => toPartyValue(toPartyRow(party))),
    paid_for_split: paidForSplit.split,
  };
};
