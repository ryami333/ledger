import { z } from "zod";

/**
 * The input schemas of the MCP tools (PLAN.md, D15). The descriptions go to
 * the MCP client, thus they tell the model how to fill each field.
 */

const spaceField = z
  .string()
  .optional()
  .describe(
    "The slug of the space, from list_spaces. Leave it out only when there is one space.",
  );

/** An amount as a decimal text. A JSON number can lose digits (D4). */
const amountField = z
  .string()
  .regex(/^\d+(\.\d+)?$/, 'Give the amount as a text, for example "90.00".')
  .describe(
    'The amount as a decimal text with a point, for example "90" or "12.50". Not a number.',
  );

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Give the date as YYYY-MM-DD.")
  .describe(
    "The date of the payment, YYYY-MM-DD. Leave it out for today. get_space gives today.",
  );

const namesField = (description: string) =>
  z.array(z.string().min(1)).min(1).describe(description);

const splitField = (side: string) =>
  z
    .object({
      mode: z
        .enum(["amount", "percent"])
        .describe('"amount" in the currency of the transaction, or "percent".'),
      values: z
        .array(z.string())
        .describe(
          `One value for each party of ${side}, in the same order. The values sum to the amount, or to 100.`,
        ),
    })
    .optional()
    .describe(
      `A custom split of ${side}. Leave it out for an equal split. "everyone" cannot have a custom split.`,
    );

export const listSpacesInputSchema = z.object({});

export const getSpaceInputSchema = z.object({ space: spaceField });

export const listTransactionsInputSchema = z.object({
  space: spaceField,
  search: z
    .string()
    .optional()
    .describe(
      'A text in the title or the notes, or the start of an amount, for example "dinner" or "90".',
    ),
  from: dateField.optional().describe("The first date, YYYY-MM-DD."),
  to: dateField.optional().describe("The last date, YYYY-MM-DD."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("The largest number of transactions, 20 by default."),
});

export const addTransactionInputSchema = z.object({
  space: spaceField,
  title: z
    .string()
    .trim()
    .min(1)
    .describe('A short title, for example "Dinner".'),
  description: z
    .string()
    .optional()
    .describe("Optional notes. Leave it out when the user gives none."),
  amount: amountField,
  currency: z
    .string()
    .optional()
    .describe(
      "The ISO 4217 code of a currency of the space, for example EUR. Leave it out for the default currency.",
    ),
  date: dateField.optional(),
  paid_by: namesField(
    "The names of the members or aliases that paid, as get_space gives them.",
  ),
  paid_for: namesField(
    'The names of the members or aliases that the payment is for, the payers too if they got a part. "everyone" gives each member.',
  ),
  paid_by_split: splitField("paid_by"),
  paid_for_split: splitField("paid_for"),
  allow_duplicate: z
    .boolean()
    .optional()
    .describe(
      "Set to true only when the user confirms a second transaction with the same date, title, amount, and currency.",
    ),
});

export const updateTransactionInputSchema = z.object({
  space: spaceField,
  transaction_id: z
    .guid()
    .describe("The ID of the transaction, from list_transactions."),
  title: z.string().trim().min(1).optional(),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("New notes, or null to remove them."),
  amount: amountField.optional(),
  currency: z.string().optional(),
  date: dateField.optional(),
  paid_by: namesField("New payers. Leave it out to keep them.").optional(),
  paid_for: namesField(
    "New parties that the payment is for. Leave it out to keep them.",
  ).optional(),
  paid_by_split: splitField("paid_by").nullable(),
  paid_for_split: splitField("paid_for").nullable(),
});

export const deleteTransactionInputSchema = z.object({
  space: spaceField,
  transaction_id: z
    .guid()
    .describe("The ID of the transaction, from list_transactions."),
});

export const claimSpaceMemberInputSchema = z.object({
  space: spaceField,
  member: z
    .string()
    .min(1)
    .nullable()
    .describe(
      "The name of the member that the user is, as get_space gives it. null removes the link. Call it only after the user tells you which member they are.",
    ),
});

export const setDefaultSpaceInputSchema = z.object({
  space: z
    .string()
    .min(1)
    .nullable()
    .describe(
      "The slug of the space, from list_spaces. null removes the default space.",
    ),
});
