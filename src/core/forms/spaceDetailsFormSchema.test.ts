import { spaceDetailsFormSchema } from "./spaceDetailsFormSchema.ts";
import { describe, expect, it } from "vitest";

const parseSlug = (slug: string) =>
  spaceDetailsFormSchema.safeParse({
    title: "Washington",
    description: "",
    slug,
  });

describe("spaceDetailsFormSchema", () => {
  it("gives a slug with small letters and no spaces at the ends", () => {
    expect(parseSlug(" Road-Trip-2026 ").data).toEqual({
      title: "Washington",
      description: null,
      slug: "road-trip-2026",
    });
  });

  it("accepts the ID of a space, the slug of an old space", () => {
    expect(parseSlug("10000000-0000-0000-0000-00000000000a").success).toBe(
      true,
    );
  });

  it.each(["", "road trip", "road--trip", "-road", "road-", "straße", "a/b"])(
    "refuses the slug %j",
    (slug) => {
      expect(parseSlug(slug).success).toBe(false);
    },
  );

  it("refuses a slug of more than 100 characters", () => {
    expect(parseSlug("a".repeat(100)).success).toBe(true);
    expect(parseSlug("a".repeat(101)).success).toBe(false);
  });
});
