import { type PartyRow, getPartyId } from "../balances/splitSide.ts";

/** A member or an alias with its name. */
export type NamedRow = { id: string; name: string };

/**
 * Gives the name of the member or the alias of a party. It throws when the
 * lists do not have the member or the alias.
 */
export const getPartyName = ({
  party,
  members,
  aliases,
}: {
  party: PartyRow;
  members: readonly NamedRow[];
  aliases: readonly NamedRow[];
}): string => {
  const partyId = getPartyId(party);
  const candidates = party.member_id === null ? aliases : members;
  const match = candidates.find((candidate) => candidate.id === partyId);
  if (!match) {
    throw new Error(`The party ${partyId} is not in the space`);
  }
  return match.name;
};
