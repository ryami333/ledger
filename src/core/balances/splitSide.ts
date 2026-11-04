/** The two sides of a transaction: the payers and the payees. */
export type TransactionSide = "paid_by" | "paid_to";

/** One party of a side: a member or an alias, as in `transaction_parties`. */
export type PartyRow = {
  member_id: string | null;
  alias_id: string | null;
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
 * Splits an amount in equal parts, one for each recipient (PLAN.md, D6, rule
 * 4). Each recipient gets `floor(amount / count)`. The first
 * `amount % count` recipients, sorted by ID, get one more minor unit.
 */
const splitEqually = ({
  amountMinor,
  recipientIds,
}: {
  amountMinor: bigint;
  recipientIds: readonly string[];
}): { recipientId: string; amountMinor: bigint }[] => {
  const count = BigInt(recipientIds.length);
  const part = amountMinor / count;
  const remainder = amountMinor % count;
  return recipientIds.toSorted().map((recipientId, recipientIndex) => ({
    recipientId,
    amountMinor: BigInt(recipientIndex) < remainder ? part + 1n : part,
  }));
};

/**
 * Splits the converted amount of one side into the share of each member
 * (PLAN.md, D6):
 *
 * 1. Each party of the side gets an equal part. An alias is one party.
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

  const parts = splitEqually({
    amountMinor,
    recipientIds: parties.map(getPartyId),
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
    for (const memberShare of splitEqually({
      amountMinor: part.amountMinor,
      recipientIds: memberIds,
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
