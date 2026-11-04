import { formatAmount } from "../money/formatAmount.ts";

/**
 * Writes the balance of a member as a sentence (PLAN.md, D10):
 *
 * - positive: "Barack is owed €25.00."
 * - negative: "Donald owes €25.00."
 * - zero: "Michelle is settled up."
 *
 * Give the default currency of the space and the locale `APP_LOCALE`.
 */
export const describeBalance = ({
  name,
  balanceMinor,
  currency,
  locale,
}: {
  name: string;
  balanceMinor: bigint;
  currency: string;
  locale: string;
}): string => {
  const amount = formatAmount({
    amountMinor: balanceMinor < 0n ? -balanceMinor : balanceMinor,
    currency,
    locale,
  });
  if (balanceMinor > 0n) return `${name} is owed ${amount}.`;
  if (balanceMinor < 0n) return `${name} owes ${amount}.`;
  return `${name} is settled up.`;
};
