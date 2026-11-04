/**
 * Gives the number of decimals of a currency, for example 2 for EUR, 0 for
 * JPY, and 3 for KWD. `Intl.NumberFormat` gives the value (PLAN.md, D4).
 */
export const getCurrencyDecimals = (currency: string): number =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
