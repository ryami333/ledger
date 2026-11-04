import { divideRounded } from "../money/divideRounded.ts";
import { getCurrencyDecimals } from "../money/getCurrencyDecimals.ts";
import { SCALED_RATE_ONE } from "./parseRate.ts";

/**
 * Converts an amount in minor units of a space currency to minor units of the
 * default currency (PLAN.md, D5):
 * `amount_minor × rate × 10^(default decimals − currency decimals)`.
 *
 * It uses `bigint` arithmetic only. It rounds half away from zero to a whole
 * minor unit of the default currency. Give the rate scaled, from `parseRate`.
 */
export const convertAmount = ({
  amountMinor,
  currency,
  scaledRate,
  defaultCurrency,
}: {
  amountMinor: bigint;
  currency: string;
  scaledRate: bigint;
  defaultCurrency: string;
}): bigint => {
  const decimalShift =
    getCurrencyDecimals(defaultCurrency) - getCurrencyDecimals(currency);
  const dividend =
    amountMinor * scaledRate * 10n ** BigInt(Math.max(decimalShift, 0));
  const divisor = SCALED_RATE_ONE * 10n ** BigInt(Math.max(-decimalShift, 0));
  return divideRounded({ dividend, divisor });
};
