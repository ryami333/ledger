/**
 * Writes an amount in minor units as a decimal text with a point, for example
 * `-1250n` with 2 decimals gives "-12.50". The text has no rounding error.
 */
export const minorToDecimalText = ({
  amountMinor,
  decimals,
}: {
  amountMinor: bigint;
  decimals: number;
}): string => {
  const sign = amountMinor < 0n ? "-" : "";
  const digits = (amountMinor < 0n ? -amountMinor : amountMinor)
    .toString()
    .padStart(decimals + 1, "0");
  if (decimals === 0) {
    return `${sign}${digits}`;
  }
  const wholePart = digits.slice(0, -decimals);
  const fractionPart = digits.slice(-decimals);
  return `${sign}${wholePart}.${fractionPart}`;
};
