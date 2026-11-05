/**
 * Gives a member ID for each name of an import, or "" when no member fits.
 * A member with the same name fits first, with no difference between upper
 * case and lower case. Then a member whose name starts with the other name
 * fits, for example "Shan" for "Shannon". Each member fits one name only.
 */
export const guessMemberIds = ({
  names,
  members,
  locale,
}: {
  names: readonly string[];
  members: readonly { id: string; name: string }[];
  locale: string;
}): string[] => {
  const normalize = (text: string) => text.trim().toLocaleLowerCase(locale);
  const usedIds = new Set<string>();
  const pick = (isMatch: (name: string, memberName: string) => boolean) =>
    names.map((name) => {
      const member = members.find(
        (candidate) =>
          !usedIds.has(candidate.id) &&
          isMatch(normalize(name), normalize(candidate.name)),
      );
      if (member) usedIds.add(member.id);
      return member?.id ?? null;
    });
  const exactIds = pick((name, memberName) => name === memberName);
  const prefixIds = pick(
    (name, memberName) =>
      name !== "" &&
      memberName !== "" &&
      (name.startsWith(memberName) || memberName.startsWith(name)),
  );
  return names.map(
    (_, nameIndex) => exactIds[nameIndex] ?? prefixIds[nameIndex] ?? "",
  );
};
