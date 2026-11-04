import { type PartyRow, getPartyId } from "../balances/splitSide.ts";

/**
 * One party in the body of `save_transaction`: `{ "member_id": ... }` or
 * `{ "alias_id": ... }` (PLAN.md, D9).
 */
export type PartyReference = { member_id: string } | { alias_id: string };

const partyValuePattern =
  /^(member|alias):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Writes a party as the value of an option of the party picker, for example
 * "member:<id>" or "alias:<id>". Thus one picker can hold members and
 * aliases.
 */
export const toPartyValue = (party: PartyRow): string =>
  `${party.member_id !== null ? "member" : "alias"}:${getPartyId(party)}`;

/**
 * Reads the value of an option of the party picker. It returns `null` for a
 * value that `toPartyValue` does not write.
 */
export const parsePartyValue = (value: string): PartyReference | null => {
  const match = partyValuePattern.exec(value);
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return match[1] === "member"
    ? { member_id: match[2] }
    : { alias_id: match[2] };
};
