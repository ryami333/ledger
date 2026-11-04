import { divideRounded } from "../money/divideRounded.ts";
import { formatRate } from "./formatRate.ts";
import { SCALED_RATE_ONE, parseRate } from "./parseRate.ts";

/** One row of the currency form, with the rate as text. */
export type SpaceCurrencyInput = {
  currency: string;
  rate: string;
  is_default: boolean;
};

/**
 * Gives each rate again, relative to a new default currency (PLAN.md, D5).
 * The currency form calls it when the user selects a different default
 * currency. The user can then correct the rates before the save.
 *
 * Each new rate is `old rate / old rate of the new default currency`,
 * rounded half away from zero to 8 decimals. The new default currency gets
 * the rate "1". A rate text that is not valid stays the same. A very small
 * rate can round to "0": the currency form schema then refuses it.
 *
 * It returns `null` when the list does not have the new default currency, or
 * when the rate of the new default currency is not valid.
 */
export const rebaseRates = ({
  currencies,
  defaultCurrency,
}: {
  currencies: readonly SpaceCurrencyInput[];
  defaultCurrency: string;
}): SpaceCurrencyInput[] | null => {
  const newDefault = currencies.find(
    (spaceCurrency) => spaceCurrency.currency === defaultCurrency,
  );
  const newDefaultScaledRate = newDefault ? parseRate(newDefault.rate) : null;
  if (newDefaultScaledRate === null) {
    return null;
  }
  return currencies.map((spaceCurrency): SpaceCurrencyInput => {
    if (spaceCurrency.currency === defaultCurrency) {
      return { ...spaceCurrency, rate: "1", is_default: true };
    }
    const scaledRate = parseRate(spaceCurrency.rate);
    if (scaledRate === null) {
      return { ...spaceCurrency, is_default: false };
    }
    const rebasedScaledRate = divideRounded({
      dividend: scaledRate * SCALED_RATE_ONE,
      divisor: newDefaultScaledRate,
    });
    return {
      ...spaceCurrency,
      rate: formatRate(rebasedScaledRate),
      is_default: false,
    };
  });
};
