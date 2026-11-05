import { getCurrencyDecimals } from "./getCurrencyDecimals.ts";
import { parseDecimalText } from "./parseDecimalText.ts";

/**
 * Converts the text of an amount input to minor units, with string
 * arithmetic and no float (PLAN.md, D4). Example: "12.5" in EUR gives `1250n`.
 *
 * The decimal separator is a point. The function ignores spaces at the start
 * and at the end. It returns `null` for a text that is not an amount, for a
 * negative amount, and for more decimals than the currency has. It does not
 * round. Zero is a valid result: the form schema refuses it.
 */
export const parseAmount = ({
  text,
  currency,
}: {
  text: string;
  currency: string;
}): bigint | null =>
  parseDecimalText({ text, decimals: getCurrencyDecimals(currency) });
