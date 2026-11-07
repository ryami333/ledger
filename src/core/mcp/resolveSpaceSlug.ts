/**
 * Selects the space of an MCP tool call (PLAN.md, D15). With no slug, the
 * only space is the result. Returns an error with the slugs of the spaces
 * when the slug is not clear.
 */
export const resolveSpaceSlug = ({
  slug,
  spaces,
}: {
  slug: string | undefined;
  spaces: readonly { slug: string; title: string }[];
}): { slug: string } | { error: string } => {
  const spaceList = spaces
    .map((space) => `"${space.slug}" (${space.title})`)
    .join(", ");
  if (slug === undefined) {
    const [onlySpace, ...otherSpaces] = spaces;
    if (onlySpace !== undefined && otherSpaces.length === 0) {
      return { slug: onlySpace.slug };
    }
    if (onlySpace === undefined) {
      return { error: "There is no space. Make a space in ledger first." };
    }
    return {
      error: `Give the slug of the space. The spaces are: ${spaceList}. Ask the user which one they mean.`,
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
