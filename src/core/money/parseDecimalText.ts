/** Digits, then an optional decimal point and more digits. */
const decimalPattern = /^(\d*)(?:\.(\d*))?$/;

/**
 * Converts a decimal text to an integer with `decimals` implied decimals,
 * with string arithmetic and no float (PLAN.md, D4). Example: "12.5" with 2
 * decimals gives `1250n`.
 *
 * The decimal separator is a point. The function ignores spaces at the start
 * and at the end. It returns `null` for a text that is not a number, for a
 * negative number, and for more decimals than `decimals`. It does not round.
 */
export const parseDecimalText = ({
  text,
  decimals,
}: {
  text: string;
  decimals: number;
}): bigint | null => {
  const match = decimalPattern.exec(text.trim());
  if (!match) {
    return null;
  }
  const wholePart = match[1] ?? "";
  const fractionPart = match[2] ?? "";
  if (wholePart === "" && fractionPart === "") {
    return null;
  }
  if (fractionPart.length > decimals) {
    return null;
  }
  return BigInt(`${wholePart || "0"}${fractionPart.padEnd(decimals, "0")}`);
};
