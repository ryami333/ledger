import { slugSchema } from "../forms/formFieldSchemas.ts";
import { slugifyTitle } from "./slugifyTitle.ts";
import { describe, expect, it } from "vitest";

describe("slugifyTitle", () => {
  it.each([
    ["Trip to Rome 2026", "trip-to-rome-2026"],
    ["  Obamas' Shared Account  ", "obamas-shared-account"],
    ["Café & Straße", "cafe-strasse"],
    ["Ski --- Weekend!", "ski-weekend"],
    ["🏖️", ""],
  ])("gives %j the slug %j", (title, slug) => {
    expect(slugifyTitle(title)).toBe(slug);
  });

  it("gives a valid slug of 100 characters or less for a long title", () => {
    const slug = slugifyTitle(`${"a".repeat(99)} b c`);
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });
});
