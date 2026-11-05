import { divideRounded } from "../money/divideRounded.ts";
import { formatAmountInput } from "../money/formatAmountInput.ts";
import { minorToDecimalText } from "../money/minorToDecimalText.ts";
import { parseAmount } from "../money/parseAmount.ts";
import { parseDecimalText } from "../money/parseDecimalText.ts";

/**
 * The custom split of one side, as the transaction form holds it (PLAN.md,
 * D6). `values` has one text for each party of the side except the last, in
 * the order of the side. The last party gets the remainder.
 *
 * - `"amount"`: each text is an amount in the transaction currency.
 * - `"percent"`: each text is a percentage with up to 2 decimals.
 */
export type CustomSplit = {
  mode: "amount" | "percent";
  values: string[];
};

/** A percentage has up to 2 decimals. Thus 100% is 10000 basis points. */
const PERCENT_DECIMALS = 2;
const FULL_PERCENT = 10000n;

/**
 * Reads a percentage text as basis points, for example "33.33" gives
 * `3333n`. It returns `null` for a text that is not a percentage.
 */
const parsePercent = (text: string): bigint | null =>
  parseDecimalText({ text, decimals: PERCENT_DECIMALS });

/**
 * Writes basis points as a percentage text with no trailing zeros, for
 * example `4000n` gives "40" and `1250n` gives "12.5".
 */
export const formatPercent = (basisPoints: bigint): string =>
  minorToDecimalText({
    amountMinor: basisPoints,
    decimals: PERCENT_DECIMALS,
  }).replace(/\.?0+$/, "");

/** Gives the percentage of a share in the amount, rounded to 2 decimals. */
export const getSharePercent = ({
  shareMinor,
  amountMinor,
}: {
  shareMinor: bigint;
  amountMinor: bigint;
}): string =>
  formatPercent(
    divideRounded({
      dividend: shareMinor * FULL_PERCENT,
      divisor: amountMinor,
    }),
  );

/**
 * Calculates the share of each party of a side from a custom split, in minor
 * units of the transaction currency. The result has one share for each
 * party. The last share is the remainder: the amount minus the other shares.
 * Thus the shares sum to the amount exactly.
 *
 * A percentage share rounds half away from zero to a whole minor unit. Each
 * share must be larger than zero, the remainder too.
 */
export const resolveCustomSplit = ({
  split,
  amountMinor,
  currency,
  partyCount,
}: {
  split: CustomSplit;
  amountMinor: bigint;
  currency: string;
  partyCount: number;
}): { shares: bigint[] } | { error: string } => {
  if (partyCount < 2 || split.values.length !== partyCount - 1) {
    return { error: "The custom split does not agree with the parties." };
  }
  const parsedValues = split.values.map((text) =>
    split.mode === "amount"
      ? parseAmount({ text, currency })
      : parsePercent(text),
  );
  if (parsedValues.some((value) => value === null)) {
    return {
      error:
        split.mode === "amount"
          ? "Enter an amount for each party, with the decimals of the currency."
          : "Enter a percentage for each party, for example 40 or 12.5.",
    };
  }
  const values = parsedValues.filter((value) => value !== null);
  const shares =
    split.mode === "amount"
      ? values
      : values.map((basisPoints) =>
          divideRounded({
            dividend: amountMinor * basisPoints,
            divisor: FULL_PERCENT,
          }),
        );
  if (shares.some((share) => share <= 0n)) {
    return { error: "Each share must be larger than zero." };
  }
  const total = shares.reduce((accumulator, share) => accumulator + share, 0n);
  const remainder = amountMinor - total;
  if (remainder <= 0n) {
    return {
      error: "The shares must leave a remainder for the last party.",
    };
  }
  return { shares: [...shares, remainder] };
};

/**
 * Converts the texts of a custom split to the other mode, for the toggle of
 * the split modal. A text that is not valid gives an empty text.
 */
export const convertCustomSplit = ({
  split,
  amountMinor,
  currency,
}: {
  split: CustomSplit;
  amountMinor: bigint;
  currency: string;
}): CustomSplit => {
  if (split.mode === "amount") {
    return {
      mode: "percent",
      values: split.values.map((text) => {
        const shareMinor = parseAmount({ text, currency });
        if (shareMinor === null) return "";
        return getSharePercent({ shareMinor, amountMinor });
      }),
    };
  }
  return {
    mode: "amount",
    values: split.values.map((text) => {
      const basisPoints = parsePercent(text);
      if (basisPoints === null) return "";
      return formatAmountInput({
        amountMinor: divideRounded({
          dividend: amountMinor * basisPoints,
          divisor: FULL_PERCENT,
        }),
        currency,
      });
    }),
  };
};

/**
 * Gives an equal custom split in percent, as the start value of the split
 * modal. Each party except the last gets `floor(100% / count)`, to 2
 * decimals. The last party gets the remainder.
 */
export const createEqualCustomSplit = (partyCount: number): CustomSplit => ({
  mode: "percent",
  values: Array.from({ length: Math.max(partyCount - 1, 0) }, () =>
    formatPercent(FULL_PERCENT / BigInt(Math.max(partyCount, 1))),
  ),
});

/**
 * Gives the custom split of saved shares, in the mode `"amount"`. The form of
 * an existing transaction uses it. The last share is the remainder, thus it
 * has no text.
 */
export const customSplitFromShares = ({
  shares,
  currency,
}: {
  shares: readonly bigint[];
  currency: string;
}): CustomSplit => ({
  mode: "amount",
  values: shares
    .slice(0, -1)
    .map((shareMinor) =>
      formatAmountInput({ amountMinor: shareMinor, currency }),
    ),
});
