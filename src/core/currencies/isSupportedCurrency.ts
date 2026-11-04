import { isCurrencyCode } from "./isCurrencyCode.ts";

/**
 * Tells if a text is an ISO 4217 currency code that `Intl` knows, for example
 * `EUR`. `Intl` must know the code, so that it can give the decimals and the
 * symbol of the currency (PLAN.md, D4).
 */
export const isSupportedCurrency = (input: string): boolean =>
  isCurrencyCode(input) && Intl.supportedValuesOf("currency").includes(input);
