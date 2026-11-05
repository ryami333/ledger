import { spaceFormSchema } from "./spaceFormSchema.ts";
import { describe, expect, it } from "vitest";

describe("spaceFormSchema", () => {
  it("gives the parameters of create_space, with no empty names", () => {
    expect(
      spaceFormSchema.parse({
        title: " Washington ",
        description: " ",
        slug: " Washington ",
        default_currency: "EUR",
        member_names: [" Barack ", "", "Michelle", "  "],
      }),
    ).toEqual({
      title: "Washington",
      description: null,
      slug: "washington",
      default_currency: "EUR",
      member_names: ["Barack", "Michelle"],
    });
  });

  it("refuses two names that differ only in capital letters", () => {
    expect(
      spaceFormSchema
        .safeParse({
          title: "Washington",
          description: "",
          slug: "washington",
          default_currency: "EUR",
          member_names: ["Barack", "", " barack"],
        })
        .error?.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
    ).toEqual([
      {
        path: "member_names.2",
        message: "Each member needs a different name.",
      },
    ]);
  });

  it("refuses an empty title, an empty slug, and an unknown currency", () => {
    expect(
      spaceFormSchema
        .safeParse({
          title: "",
          description: "",
          slug: "",
          default_currency: "",
          member_names: [],
        })
        .error?.issues.map((issue) => issue.message),
    ).toEqual([
      "Enter a title.",
      "Enter a slug.",
      "Use only letters, digits, and single hyphens between them.",
      "Select a currency.",
    ]);
  });

  it("gives the title and the description for the edit form", () => {
    expect(
      spaceFormSchema
        .pick({ title: true, description: true })
        .parse({ title: "Trip", description: "Rome" }),
    ).toEqual({ title: "Trip", description: "Rome" });
  });
});
