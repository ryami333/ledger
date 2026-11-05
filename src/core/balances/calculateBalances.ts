import { convertAmount } from "../currencies/convertAmount.ts";
import { parseRate } from "../currencies/parseRate.ts";
import {
  type AliasMemberRow,
  type PartyRow,
  type TransactionSide,
  splitSide,
} from "./splitSide.ts";

/** The columns of `members` that the balances use. */
export type BalanceMemberRow = {
  id: string;
  name: string;
  archived_at: string | null;
};

/**
 * The columns of `transactions` that the balances use. `rate` is the rate of
 * the transaction, from its save. Select it as `rate::text` (PLAN.md, D5).
 */
export type BalanceTransactionRow = {
  id: string;
  amount_minor: bigint;
  currency: string;
  rate: string;
};

/** The columns of `transaction_parties` that the balances use. */
export type BalancePartyRow = PartyRow & {
  transaction_id: string;
  side: TransactionSide;
};

/** The balance of one member, in minor units of the default currency. */
export type MemberBalance = {
  member_id: string;
  name: string;
  balance_minor: bigint;
};

/**
 * Gives the position of a balance in the sort order of D10: the members who
 * are owed first, then the members who owe, then the settled members.
 */
const getBalanceGroup = (balanceMinor: bigint): number => {
  if (balanceMinor > 0n) return 0;
  if (balanceMinor < 0n) return 1;
  return 2;
};

const compareBalances = (first: MemberBalance, second: MemberBalance) => {
  const groupDifference =
    getBalanceGroup(first.balance_minor) -
    getBalanceGroup(second.balance_minor);
  if (groupDifference !== 0) return groupDifference;
  const absoluteFirst =
    first.balance_minor < 0n ? -first.balance_minor : first.balance_minor;
  const absoluteSecond =
    second.balance_minor < 0n ? -second.balance_minor : second.balance_minor;
  if (absoluteFirst !== absoluteSecond) {
    return absoluteFirst > absoluteSecond ? -1 : 1;
  }
  return (
    first.name.localeCompare(second.name) ||
    first.member_id.localeCompare(second.member_id)
  );
};

/**
 * Calculates the balance of each member of a space, in the default currency
 * (PLAN.md, D10). A positive balance means "is owed".
 *
 * For each transaction, it converts the amount to the default currency
 * first, with the rate of the transaction (D5). Then it splits the converted
 * amount on each side (D6). A paid
 * share adds to the balance, and a received share subtracts from it. Thus
 * the balances of a space sum to zero.
 *
 * The result has each member that is not archived, and each archived member
 * with a balance that is not zero (D8). The order is the order of D10: the
 * members who are owed, then the members who owe, then the settled members.
 * In each group, the largest amount comes first, then the name.
 *
 * It throws when the rows do not agree, for example a transaction with a
 * rate that is not valid.
 */
export const calculateBalances = ({
  members,
  aliasMembers,
  defaultCurrency,
  transactions,
  parties,
}: {
  members: readonly BalanceMemberRow[];
  aliasMembers: readonly AliasMemberRow[];
  defaultCurrency: string;
  transactions: readonly BalanceTransactionRow[];
  parties: readonly BalancePartyRow[];
}): MemberBalance[] => {
  const balances = new Map(members.map((member) => [member.id, 0n]));
  const addToBalance = ({
    memberId,
    amountMinor,
  }: {
    memberId: string;
    amountMinor: bigint;
  }) => {
    const balance = balances.get(memberId);
    if (balance === undefined) {
      throw new Error(`The member ${memberId} is not in the space`);
    }
    balances.set(memberId, balance + amountMinor);
  };

  const partiesByTransaction = Map.groupBy(
    parties,
    (party) => party.transaction_id,
  );
  for (const transaction of transactions) {
    const scaledRate = parseRate(transaction.rate);
    if (scaledRate === null) {
      throw new Error(
        `The rate of the transaction ${transaction.id} is not valid`,
      );
    }
    const convertedAmount = convertAmount({
      amountMinor: transaction.amount_minor,
      currency: transaction.currency,
      scaledRate,
      defaultCurrency,
    });
    const transactionParties = partiesByTransaction.get(transaction.id) ?? [];
    for (const side of ["paid_by", "paid_for"] as const) {
      const shares = splitSide({
        amountMinor: convertedAmount,
        parties: transactionParties.filter((party) => party.side === side),
        aliasMembers,
      });
      for (const [memberId, shareMinor] of shares) {
        addToBalance({
          memberId,
          amountMinor: side === "paid_by" ? shareMinor : -shareMinor,
        });
      }
    }
  }

  return members
    .filter(
      (member) => member.archived_at === null || balances.get(member.id) !== 0n,
    )
    .map((member) => ({
      member_id: member.id,
      name: member.name,
      balance_minor: balances.get(member.id) ?? 0n,
    }))
    .toSorted(compareBalances);
};
