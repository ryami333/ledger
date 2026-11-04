import { RATE_DECIMALS } from "./parseRate.ts";

/**
 * Writes a scaled rate (the rate times 10^8) as a text with no zeros at the
 * end, for example `92000000n` gives "0.92". The rate input shows this text,
 * and `save_space_currencies` gets it.
 */
export const formatRate = (scaledRate: bigint): string => {
  const digits = scaledRate.toString().padStart(RATE_DECIMALS + 1, "0");
  const wholePart = digits.slice(0, -RATE_DECIMALS);
  const fractionPart = digits.slice(-RATE_DECIMALS).replace(/0+$/, "");
  return fractionPart === "" ? wholePart : `${wholePart}.${fractionPart}`;
};
