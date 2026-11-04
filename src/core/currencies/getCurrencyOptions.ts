/** One option of a currency picker. */
export type CurrencyOption = { value: string; label: string };

/**
 * Gives an option for each currency that `Intl` knows, sorted by code, for
 * example `{ value: "EUR", label: "EUR · Euro" }`. Give the locale
 * `APP_LOCALE`, so that the server and the browser give the same labels.
 */
export const getCurrencyOptions = (locale: string): CurrencyOption[] => {
  const displayNames = new Intl.DisplayNames(locale, { type: "currency" });
  return Intl.supportedValuesOf("currency").map((currency) => {
    const name = displayNames.of(currency);
    return {
      value: currency,
      label: name && name !== currency ? `${currency} · ${name}` : currency,
    };
  });
};
