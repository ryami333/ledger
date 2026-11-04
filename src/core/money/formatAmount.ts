import { getCurrencyDecimals } from "./getCurrencyDecimals.ts";
import { minorToDecimalText } from "./minorToDecimalText.ts";

/**
 * Formats an amount in minor units for the UI, for example `2500n` in EUR
 * gives "€25.00" (PLAN.md, D4). Give the locale `APP_LOCALE`, so that the
 * server and the browser give the same text.
 *
 * `Intl.NumberFormat` gets a decimal text, not a number. Thus a large amount
 * keeps all its digits.
 */
export const formatAmount = ({
  amountMinor,
  currency,
  locale,
}: {
  amountMinor: bigint;
  currency: string;
  locale: string;
}): string => {
  const decimals = getCurrencyDecimals(currency);
  const decimalText = minorToDecimalText({ amountMinor, decimals });
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(decimalText as Intl.StringNumericLiteral);
};
