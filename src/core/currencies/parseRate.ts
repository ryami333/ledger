/** The number of decimals of a rate: `numeric(18, 8)` (PLAN.md, D5). */
export const RATE_DECIMALS = 8;

/** The scaled rate of 1, the rate of the default currency. */
export const SCALED_RATE_ONE = 10n ** BigInt(RATE_DECIMALS);

/** `numeric(18, 8)` holds 10 digits before the decimal point. */
const ratePattern = /^(\d{0,10})(?:\.(\d{0,8}))?$/;

/**
 * Converts the text of a rate to a scaled rate: the rate times 10^8, as a
 * `bigint`. Example: "0.92" gives `92000000n`. Select a rate from PostgREST
 * as `rate::text`, so that it keeps all its digits (PLAN.md, D5).
 *
 * It returns `null` for a text that is not a rate, for a rate of zero, and
 * for a rate that `numeric(18, 8)` cannot hold. It does not round.
 */
export const parseRate = (text: string): bigint | null => {
  const match = ratePattern.exec(text.trim());
  if (!match) {
    return null;
  }
  const wholePart = match[1] ?? "";
  const fractionPart = match[2] ?? "";
  if (wholePart === "" && fractionPart === "") {
    return null;
  }
  const scaledRate = BigInt(
    `${wholePart || "0"}${fractionPart.padEnd(RATE_DECIMALS, "0")}`,
  );
  return scaledRate > 0n ? scaledRate : null;
};
