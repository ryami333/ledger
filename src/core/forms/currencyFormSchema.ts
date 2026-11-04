import { formatRate } from "../currencies/formatRate.ts";
import { SCALED_RATE_ONE, parseRate } from "../currencies/parseRate.ts";
import { currencyCodeSchema } from "./formFieldSchemas.ts";
import { z } from "zod";

/** One row of the currency form. The rate is the text of the rate input. */
const spaceCurrencySchema = z
  .object({
    currency: currencyCodeSchema,
    rate: z.string(),
    is_default: z.boolean(),
  })
  .transform((row, context) => {
    const scaledRate = parseRate(row.rate);
    if (scaledRate === null) {
      context.addIssue({
        code: "custom",
        path: ["rate"],
        message: "Enter a rate larger than zero, with 8 decimals or fewer.",
      });
      return z.NEVER;
    }
    if (row.is_default && scaledRate !== SCALED_RATE_ONE) {
      context.addIssue({
        code: "custom",
        path: ["rate"],
        message: "The rate of the default currency is 1.",
      });
      return z.NEVER;
    }
    return { ...row, rate: formatRate(scaledRate) };
  });

/**
 * The currency form in the settings of a space (PLAN.md, D5). The output
 * `currencies` is the jsonb array of `save_space_currencies`, with each rate
 * as text, so that it keeps all its digits.
 */
export const currencyFormSchema = z.object({
  currencies: z
    .array(spaceCurrencySchema)
    .min(1, "Add one or more currencies.")
    .superRefine((rows, context) => {
      const defaultCount = rows.filter((row) => row.is_default).length;
      if (defaultCount !== 1) {
        context.addIssue({
          code: "custom",
          message: "Select exactly one default currency.",
        });
      }
      const seenCurrencies = new Set<string>();
      rows.forEach((row, rowIndex) => {
        if (seenCurrencies.has(row.currency)) {
          context.addIssue({
            code: "custom",
            path: [rowIndex, "currency"],
            message: "The list has this currency already.",
          });
        }
        seenCurrencies.add(row.currency);
      });
    }),
});
