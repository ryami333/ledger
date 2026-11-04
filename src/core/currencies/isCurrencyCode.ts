/**
 * Tells if a text has the form of an ISO 4217 currency code: three capital
 * letters, for example `EUR`. It does not check that the code exists.
 */
export const isCurrencyCode = (input: string): boolean =>
  /^[A-Z]{3}$/.test(input);
