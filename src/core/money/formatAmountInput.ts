import { getCurrencyDecimals } from "./getCurrencyDecimals.ts";
import { minorToDecimalText } from "./minorToDecimalText.ts";

/**
 * Writes an amount in minor units as the text of an amount input, for example
 * `1250n` in EUR gives "12.50". It is the opposite of `parseAmount`. The form
 * of an existing transaction uses it for its default value.
 */
export const formatAmountInput = ({
  amountMinor,
  currency,
}: {
  amountMinor: bigint;
  currency: string;
}): string =>
  minorToDecimalText({ amountMinor, decimals: getCurrencyDecimals(currency) });
