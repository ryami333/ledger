import { parseAmount } from "../money/parseAmount.ts";
import { resolveCustomSplit } from "../splits/customSplitHelpers.ts";
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
 * The custom split of one side, or `null` for an equal split (PLAN.md, D6).
 * See `CustomSplit` in `src/core/splits/customSplitHelpers.ts`.
 */
const customSplitSchema = z
  .object({
    mode: z.enum(["amount", "percent"]),
    values: z.array(z.string()),
  })
  .nullable();

/**
 * The transaction form (PLAN.md, UI). The output has the parameters of
 * `save_transaction`, with the amount in minor units and the date as a
 * `Temporal.PlainDate`.
 *
 * The amount input can give a text or a number. The schema converts a number
 * to its text, with no float arithmetic.
 *
 * Each party of the output has `share_minor`: its custom share in minor units
 * of the transaction currency, or `null` for an equal split.
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
    paid_by_split: customSplitSchema,
    paid_for: partiesSchema("Select who the payment is for."),
    paid_for_split: customSplitSchema,
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
    const withShares = ({
      parties,
      split,
      path,
    }: {
      parties: PartyReference[];
      split: z.output<typeof customSplitSchema>;
      path: "paid_by_split" | "paid_for_split";
    }) => {
      if (split === null) {
        return parties.map((party) => ({ ...party, share_minor: null }));
      }
      const result = resolveCustomSplit({
        split,
        amountMinor,
        currency: values.currency,
        partyCount: parties.length,
      });
      if ("error" in result) {
        context.addIssue({
          code: "custom",
          path: [path],
          message: result.error,
        });
        return null;
      }
      return parties.map((party, partyIndex) => ({
        ...party,
        share_minor: result.shares[partyIndex] ?? null,
      }));
    };
    const paidBy = withShares({
      parties: values.paid_by,
      split: values.paid_by_split,
      path: "paid_by_split",
    });
    const paidFor = withShares({
      parties: values.paid_for,
      split: values.paid_for_split,
      path: "paid_for_split",
    });
    if (paidBy === null || paidFor === null) {
      return z.NEVER;
    }
    return {
      title: values.title,
      description: values.description,
      amount_minor: amountMinor,
      currency: values.currency,
      transaction_date: values.transaction_date,
      paid_by: paidBy,
      paid_for: paidFor,
    };
  });
