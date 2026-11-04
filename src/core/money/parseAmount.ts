import { getCurrencyDecimals } from "./getCurrencyDecimals.ts";

/** Digits, then an optional decimal point and more digits. */
const amountPattern = /^(\d*)(?:\.(\d*))?$/;

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
}): bigint | null => {
  const match = amountPattern.exec(text.trim());
  if (!match) {
    return null;
  }
  const wholePart = match[1] ?? "";
  const fractionPart = match[2] ?? "";
  if (wholePart === "" && fractionPart === "") {
    return null;
  }
  const decimals = getCurrencyDecimals(currency);
  if (fractionPart.length > decimals) {
    return null;
  }
  return BigInt(`${wholePart || "0"}${fractionPart.padEnd(decimals, "0")}`);
};
