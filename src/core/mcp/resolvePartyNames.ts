import type { PartyReference } from "../transactions/partyValueHelpers.ts";

/** The names that give each member that is not archived (PLAN.md, D6). */
const everyoneNames = new Set(["everyone", "everybody", "all"]);

/**
 * Writes a name for a comparison: small letters, no accents, no
 * apostrophes, and single spaces. Thus "obamas shared account" finds
 * "Obamas' Shared Account", and "Zoe" finds "Zoë".
 */
export const normalizePartyName = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’`]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/**
 * Finds the party of each name of one side of a transaction, for the MCP
 * tools (PLAN.md, D15). A name matches a member or an alias of the space,
 * with `normalizePartyName`. "everyone" gives each member that is not
 * archived, unless a member or an alias has that name.
 *
 * Returns an error with the names of the space when a name matches no
 * party, or more than one party. The client can then ask the user. A party
 * that two names give is in the result one time.
 */
export const resolvePartyNames = ({
  names,
  members,
  aliases,
}: {
  names: readonly string[];
  members: readonly { id: string; name: string; archived_at: string | null }[];
  aliases: readonly { id: string; name: string }[];
}):
  { parties: PartyReference[]; usesEveryone: boolean } | { error: string } => {
  const candidates = [
    ...members.map((member) => ({
      key: normalizePartyName(member.name),
      party: { member_id: member.id } satisfies PartyReference,
    })),
    ...aliases.map((alias) => ({
      key: normalizePartyName(alias.name),
      party: { alias_id: alias.id } satisfies PartyReference,
    })),
  ];
  const knownNames = [
    ...members
      .filter((member) => member.archived_at === null)
      .map((member) => member.name),
    ...aliases.map((alias) => alias.name),
  ].join(", ");

  /** The parties of one name, or null for an unknown name. */
  const resolveName = (
    name: string,
  ):
    | { parties: PartyReference[]; isEveryone: boolean }
    | { error: string }
    | null => {
    const key = normalizePartyName(name);
    const matches = candidates.filter((candidate) => candidate.key === key);
    if (matches.length === 0 && everyoneNames.has(key)) {
      return {
        parties: members
          .filter((member) => member.archived_at === null)
          .map((member) => ({ member_id: member.id })),
        isEveryone: true,
      };
    }
    const [match, ...otherMatches] = matches;
    if (match === undefined) return null;
    if (otherMatches.length > 0) {
      return {
        error: `"${name}" is the name of a member and of an alias. Use a different name. The space has: ${knownNames}.`,
      };
    }
    return { parties: [match.party], isEveryone: false };
  };

  const resolvedNames = names.map((name) => ({
    name,
    resolution: resolveName(name),
  }));
  const ambiguousName = resolvedNames.find(
    ({ resolution }) => resolution !== null && "error" in resolution,
  );
  if (ambiguousName?.resolution && "error" in ambiguousName.resolution) {
    return { error: ambiguousName.resolution.error };
  }
  const unknownNames = resolvedNames
    .filter(({ resolution }) => resolution === null)
    .map(({ name }) => name);
  if (unknownNames.length > 0) {
    const quotedNames = unknownNames.map((name) => `"${name}"`).join(", ");
    return {
      error: `The space has no member or alias with the name ${quotedNames}. The space has: ${knownNames}. Ask the user which one they mean.`,
    };
  }
  const resolutions = resolvedNames.flatMap(({ resolution }) =>
    resolution !== null && "parties" in resolution ? [resolution] : [],
  );
  const seenPartyKeys = new Set<string>();
  const parties = resolutions
    .flatMap((resolution) => resolution.parties)
    .filter((party) => {
      const partyKey =
        "member_id" in party
          ? `member:${party.member_id}`
          : `alias:${party.alias_id}`;
      if (seenPartyKeys.has(partyKey)) return false;
      seenPartyKeys.add(partyKey);
      return true;
    });
  if (parties.length === 0) {
    return { error: "Give one or more names." };
  }
  return {
    parties,
    usesEveryone: resolutions.some((resolution) => resolution.isEveryone),
  };
};
