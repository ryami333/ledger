import { resolveSpaceSlug } from "./resolveSpaceSlug.ts";
import { describe, expect, it } from "vitest";

const washington = { slug: "washington", title: "Washington" };
const paris = { slug: "paris-2026", title: "Paris 2026" };

describe("resolveSpaceSlug", () => {
  it("selects the only space when there is no slug", () => {
    expect(resolveSpaceSlug({ slug: undefined, spaces: [washington] })).toEqual(
      { slug: "washington" },
    );
  });

  it("asks for a slug when there are two spaces", () => {
    expect(
      resolveSpaceSlug({ slug: undefined, spaces: [washington, paris] }),
    ).toEqual({ error: expect.stringContaining('"paris-2026" (Paris 2026)') });
  });

  it("finds a space by slug or by title", () => {
    const spaces = [washington, paris];
    expect(resolveSpaceSlug({ slug: "Paris-2026", spaces })).toEqual({
      slug: "paris-2026",
    });
    expect(resolveSpaceSlug({ slug: "paris 2026", spaces })).toEqual({
      slug: "paris-2026",
    });
  });

  it("gives an error for an unknown slug and for no space", () => {
    expect(resolveSpaceSlug({ slug: "rome", spaces: [washington] })).toEqual({
      error: expect.stringContaining('There is no space "rome"'),
    });
    expect(resolveSpaceSlug({ slug: undefined, spaces: [] })).toEqual({
      error: expect.stringContaining("There is no space"),
    });
  });
});
