/**
 * Selects the space of an MCP tool call (PLAN.md, D15 and D17). With no
 * slug, the result is the default space of the user, then the only space.
 * Returns an error with the slugs of the spaces when the space is not clear.
 */
export const resolveSpaceSlug = ({
  slug,
  spaces,
}: {
  slug: string | undefined;
  spaces: readonly { slug: string; title: string; isDefault: boolean }[];
}): { slug: string } | { error: string } => {
  const spaceList = spaces
    .map((space) => `"${space.slug}" (${space.title})`)
    .join(", ");
  if (slug === undefined) {
    const defaultSpace = spaces.find((space) => space.isDefault);
    if (defaultSpace !== undefined) {
      return { slug: defaultSpace.slug };
    }
    const [onlySpace, ...otherSpaces] = spaces;
    if (onlySpace !== undefined && otherSpaces.length === 0) {
      return { slug: onlySpace.slug };
    }
    if (onlySpace === undefined) {
      return { error: "There is no space. Make a space in ledger first." };
    }
    return {
      error: `The user has no default space. Ask the user which space they mean. The spaces are: ${spaceList}. If the user wants that space for later payments too, call set_default_space.`,
    };
  }
  const normalizedSlug = slug.trim().toLowerCase();
  const space = spaces.find(
    (candidate) =>
      candidate.slug === normalizedSlug ||
      candidate.title.trim().toLowerCase() === normalizedSlug,
  );
  if (space === undefined) {
    return {
      error: `There is no space "${slug}". The spaces are: ${spaceList}.`,
    };
  }
  return { slug: space.slug };
};
