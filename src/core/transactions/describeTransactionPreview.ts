import { type PartyRow } from "../balances/splitSide.ts";
import { formatAmount } from "../money/formatAmount.ts";
import { type NamedRow, getPartyName } from "./getPartyName.ts";

/** More parties of members than this get "Each of N members". */
const MAX_LISTED_MEMBERS = 3;

/**
 * Writes the sentence of one side, for example "Barack and Donald each paid
 * €50.00." Each party gets an equal part (PLAN.md, D6). When the parts are
 * not all equal, the sentence gives the smallest part and the largest part.
 *
 * When the parties have custom shares, the sentence gives the share of each
 * party, for example "Barack paid €40.00 and Michelle paid €60.00."
 */
const describeSide = ({
  amountMinor,
  currency,
  locale,
  parties,
  members,
  aliases,
  verb,
}: {
  amountMinor: bigint;
  currency: string;
  locale: string;
  parties: readonly PartyRow[];
  members: readonly NamedRow[];
  aliases: readonly NamedRow[];
  verb: "paid" | "got";
}): string => {
  const format = (partMinor: bigint) =>
    formatAmount({ amountMinor: partMinor, currency, locale });
  const listFormat = new Intl.ListFormat(locale, { type: "conjunction" });
  const names = parties.map((party) =>
    getPartyName({ party, members, aliases }),
  );

  const customShares = parties.flatMap((party) =>
    party.share_minor === undefined || party.share_minor === null
      ? []
      : [party.share_minor],
  );
  if (customShares.length === parties.length) {
    const clauses = names.map(
      (name, partyIndex) =>
        `${name} ${verb} ${format(customShares[partyIndex] ?? 0n)}`,
    );
    return `${listFormat.format(clauses)}.`;
  }

  const count = BigInt(parties.length);
  const smallPart = amountMinor / count;
  const part =
    amountMinor % count === 0n
      ? format(smallPart)
      : `${format(smallPart)} or ${format(smallPart + 1n)}`;

  if (names.length === 1) {
    return `${names[0]} ${verb} ${part}.`;
  }
  const isOnlyMembers = parties.every((party) => party.member_id !== null);
  if (isOnlyMembers && names.length > MAX_LISTED_MEMBERS) {
    return `Each of ${names.length} members ${verb} ${part}.`;
  }
  return `${listFormat.format(names)} each ${verb} ${part}.`;
};

/**
 * Writes the preview line under the transaction form (PLAN.md, UI), for
 * example "Obamas' Shared Account and Donald each paid €50.00. Each of 4
 * members got €25.00."
 *
 * The names keep the order of the form. It splits the amount in the currency
 * of the transaction, among the parties of each side. It does not split the part of an alias among its members.
 * It returns `null` when the amount is not positive or when no side has a
 * party. It omits the sentence of a side with no party.
 */
export const describeTransactionPreview = ({
  amountMinor,
  currency,
  locale,
  paidBy,
  paidFor,
  members,
  aliases,
}: {
  amountMinor: bigint;
  currency: string;
  locale: string;
  paidBy: readonly PartyRow[];
  paidFor: readonly PartyRow[];
  members: readonly NamedRow[];
  aliases: readonly NamedRow[];
}): string | null => {
  if (amountMinor <= 0n || (paidBy.length === 0 && paidFor.length === 0)) {
    return null;
  }
  const sentences = [
    { parties: paidBy, verb: "paid" as const },
    { parties: paidFor, verb: "got" as const },
  ]
    .filter((side) => side.parties.length > 0)
    .map((side) =>
      describeSide({
        amountMinor,
        currency,
        locale,
        parties: side.parties,
        members,
        aliases,
        verb: side.verb,
      }),
    );
  return sentences.join(" ");
};
