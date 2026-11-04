import { parseAmount } from "../money/parseAmount.ts";
import {
  type PartyReference,
  parsePartyValue,
} from "../transactions/partyValueHelpers.ts";
import {
  currencyCodeSchema,
  optionalTextSchema,
  requiredTextSchema,
} from "./formFieldSchemas.ts";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

/**
 * The largest amount in minor units. PostgREST gives a `bigint` as a JSON
 * number, thus a larger amount loses digits in the client.
 */
export const MAX_AMOUNT_MINOR = BigInt(Number.MAX_SAFE_INTEGER);

/** Digits with an optional decimal point. `parseAmount` checks the rest. */
const amountTextPattern = /^\s*(\d+\.?\d*|\.\d+)\s*$/;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The values of one party picker: "member:<id>" or "alias:<id>". The output
 * is the jsonb array of `save_transaction` (PLAN.md, D9).
 */
const partiesSchema = (emptyMessage: string) =>
  z
    .array(z.string())
    .min(1, emptyMessage)
    .refine(
      (values) => new Set(values).size === values.length,
      "Select each party one time only.",
    )
    .transform((values, context): PartyReference[] =>
      values.flatMap((value) => {
        const party = parsePartyValue(value);
        if (party === null) {
          context.addIssue({ code: "custom", message: "Select a party." });
          return [];
        }
        return [party];
      }),
    );

/**
 * The transaction form (PLAN.md, UI). The output has the parameters of
 * `save_transaction`, with the amount in minor units and the date as a
 * `Temporal.PlainDate`.
 *
 * The amount input can give a text or a number. The schema converts a number
 * to its text, with no float arithmetic.
 */
export const transactionFormSchema = z
  .object({
    title: requiredTextSchema("Enter a title."),
    description: optionalTextSchema,
    amount: z
      .union([z.string(), z.number()])
      .transform(String)
      .refine(
        (text) => amountTextPattern.test(text),
        "Enter an amount, for example 12.50.",
      ),
    currency: currencyCodeSchema,
    transaction_date: z
      .string()
      .nullable()
      .transform((value, context) => {
        if (value !== null && isoDatePattern.test(value)) {
          try {
            return Temporal.PlainDate.from(value, { overflow: "reject" });
          } catch {
            // The next lines add the issue.
          }
        }
        context.addIssue({ code: "custom", message: "Enter a date." });
        return z.NEVER;
      }),
    paid_by: partiesSchema("Select one or more payers."),
    paid_for: partiesSchema("Select who the payment is for."),
  })
  .transform((values, context) => {
    const amountMinor = parseAmount({
      text: values.amount,
      currency: values.currency,
    });
    if (amountMinor === null) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "The amount has too many decimals for the currency.",
      });
      return z.NEVER;
    }
    const amountIssue = (() => {
      if (amountMinor <= 0n) return "Enter an amount larger than zero.";
      if (amountMinor > MAX_AMOUNT_MINOR) return "The amount is too large.";
      return null;
    })();
    if (amountIssue !== null) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: amountIssue,
      });
      return z.NEVER;
    }
    return {
      title: values.title,
      description: values.description,
      amount_minor: amountMinor,
      currency: values.currency,
      transaction_date: values.transaction_date,
      paid_by: values.paid_by,
      paid_for: values.paid_for,
    };
  });
