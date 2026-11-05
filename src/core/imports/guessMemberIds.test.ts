import { guessMemberIds } from "./guessMemberIds.ts";
import { describe, expect, it } from "vitest";

const members = [
  { id: "shan", name: "Shan" },
  { id: "mitch", name: "Mitch" },
];

describe("guessMemberIds", () => {
  it("finds the same name and a name that starts with the other", () => {
    expect(
      guessMemberIds({ names: ["mitch", "Shannon"], members, locale: "en" }),
    ).toEqual(["mitch", "shan"]);
  });

  it("gives an empty text for a name with no member", () => {
    expect(
      guessMemberIds({ names: ["Mitch", "Barack"], members, locale: "en" }),
    ).toEqual(["mitch", ""]);
  });

  it("gives each member to one name only, the same name first", () => {
    expect(
      guessMemberIds({ names: ["Shannon", "Shan"], members, locale: "en" }),
    ).toEqual(["", "shan"]);
  });
});
