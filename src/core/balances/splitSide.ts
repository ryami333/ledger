import { splitByWeight } from "./splitByWeight.ts";
/** The two sides of a transaction: the payers and the parties that the payment is for. */
export type TransactionSide = "paid_by" | "paid_for";

/**
 * One party of a side: a member or an alias, as in `transaction_parties`.
 * `share_minor` is the custom share of the party, in minor units of the
 * transaction currency (PLAN.md, D6). It is `null` or absent for an equal
 * split.
 */
export type PartyRow = {
  member_id: string | null;
  alias_id: string | null;
  share_minor?: bigint | null;
};

/** One row of `alias_members`. */
export type AliasMemberRow = {
  alias_id: string;
  member_id: string;
};

/**
 * Gives the ID of the member or the alias of a party. It throws for a party
 * with both IDs or with no ID.
 */
export const getPartyId = (party: PartyRow): string => {
  if (party.member_id !== null && party.alias_id === null) {
    return party.member_id;
  }
  if (party.alias_id !== null && party.member_id === null) {
    return party.alias_id;
  }
  throw new Error("A party needs exactly one of member_id and alias_id");
};

/**
 * Gives the weight of each party of a side. With no custom shares, each party
 * has the weight 1. With custom shares, the weight is the share. A side
 * cannot mix the two.
 */
const getPartyWeights = (
  parties: readonly PartyRow[],
): { recipientId: string; weight: bigint }[] => {
  const customCount = parties.filter(
    (party) => party.share_minor !== undefined && party.share_minor !== null,
  ).length;
  if (customCount !== 0 && customCount !== parties.length) {
    throw new Error("A side needs a share for each party or for no party");
  }
  return parties.map((party) => {
    const weight = party.share_minor ?? 1n;
    if (weight <= 0n) {
      throw new Error("A share must be larger than zero");
    }
    return { recipientId: getPartyId(party), weight };
  });
};

/**
 * Splits the converted amount of one side into the share of each member
 * (PLAN.md, D6):
 *
 * 1. Each party of the side gets an equal part. An alias is one party. When
 *    the parties have custom shares, each party gets a part in proportion to
 *    its share. The shares are in the transaction currency and the amount is
 *    the converted amount, thus the parts can differ from the shares.
 * 2. A member party keeps its part. An alias party splits its part in equal
 *    shares among the members of the alias.
 * 3. A member on the side two times, directly and through an alias, gets
 *    both shares.
 *
 * The shares sum to the amount exactly. The result is sorted by member ID,
 * and it does not change with the order of the input.
 */
export const splitSide = ({
  amountMinor,
  parties,
  aliasMembers,
}: {
  amountMinor: bigint;
  parties: readonly PartyRow[];
  aliasMembers: readonly AliasMemberRow[];
}): Map<string, bigint> => {
  if (parties.length === 0) {
    throw new Error("A side needs one or more parties");
  }
  if (amountMinor < 0n) {
    throw new Error("splitSide needs an amount of zero or more");
  }
  const partiesById = new Map(
    parties.map((party) => [getPartyId(party), party]),
  );
  const shares = new Map<string, bigint>();
  const addShare = ({
    memberId,
    shareMinor,
  }: {
    memberId: string;
    shareMinor: bigint;
  }) => {
    shares.set(memberId, (shares.get(memberId) ?? 0n) + shareMinor);
  };

  const parts = splitByWeight({
    amountMinor,
    recipients: getPartyWeights(parties),
  });
  for (const part of parts) {
    const party = partiesById.get(part.recipientId);
    if (!party || party.alias_id === null) {
      addShare({ memberId: part.recipientId, shareMinor: part.amountMinor });
      continue;
    }
    const aliasId = party.alias_id;
    const memberIds = aliasMembers
      .filter((aliasMember) => aliasMember.alias_id === aliasId)
      .map((aliasMember) => aliasMember.member_id);
    if (memberIds.length === 0) {
      throw new Error(`The alias ${aliasId} has no members`);
    }
    for (const memberShare of splitByWeight({
      amountMinor: part.amountMinor,
      recipients: memberIds.map((memberId) => ({
        recipientId: memberId,
        weight: 1n,
      })),
    })) {
      addShare({
        memberId: memberShare.recipientId,
        shareMinor: memberShare.amountMinor,
      });
    }
  }

  return new Map(
    [...shares.keys()]
      .toSorted()
      .map((memberId) => [memberId, shares.get(memberId) ?? 0n]),
  );
};
