import {
  type AliasMemberRow,
  type PartyRow,
  type TransactionSide,
} from "../balances/splitSide.ts";
import { type NamedRow, getPartyName } from "./getPartyName.ts";

/**
 * Writes the short line of a transaction in the transaction list, for example
 * "Obamas' Shared Account paid for everyone" (PLAN.md, UI).
 *
 * The names on each side are in alphabetical order. Paid to is "everyone"
 * when its members, also through an alias, include each member that is not
 * archived, and the space has two or more of these members.
 */
export const describeTransaction = ({
  parties,
  members,
  aliases,
  aliasMembers,
  locale,
}: {
  parties: readonly (PartyRow & { side: TransactionSide })[];
  members: readonly (NamedRow & { archived_at: string | null })[];
  aliases: readonly NamedRow[];
  aliasMembers: readonly AliasMemberRow[];
  locale: string;
}): string => {
  const listFormat = new Intl.ListFormat(locale, { type: "conjunction" });
  const describeSide = (side: TransactionSide): string =>
    listFormat.format(
      parties
        .filter((party) => party.side === side)
        .map((party) => getPartyName({ party, members, aliases }))
        .toSorted((first, second) => first.localeCompare(second, locale)),
    );

  const payeeMemberIds = new Set(
    parties
      .filter((party) => party.side === "paid_to")
      .flatMap((party) => {
        if (party.member_id !== null) return [party.member_id];
        return aliasMembers
          .filter((aliasMember) => aliasMember.alias_id === party.alias_id)
          .map((aliasMember) => aliasMember.member_id);
      }),
  );
  const activeMembers = members.filter((member) => member.archived_at === null);
  const isEveryone =
    activeMembers.length > 1 &&
    activeMembers.every((member) => payeeMemberIds.has(member.id));

  const payees = isEveryone ? "everyone" : describeSide("paid_to");
  return `${describeSide("paid_by")} paid for ${payees}`;
};
