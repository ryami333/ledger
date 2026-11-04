import { getPartyName } from "./getPartyName.ts";
import { describe, expect, it } from "vitest";

const members = [{ id: "barack", name: "Barack" }];
const aliases = [{ id: "obamas", name: "Obamas' Shared Account" }];

describe("getPartyName", () => {
  it("gives the name of a member party and of an alias party", () => {
    expect(
      getPartyName({
        party: { member_id: "barack", alias_id: null },
        members,
        aliases,
      }),
    ).toBe("Barack");
    expect(
      getPartyName({
        party: { member_id: null, alias_id: "obamas" },
        members,
        aliases,
      }),
    ).toBe("Obamas' Shared Account");
  });

  it("refuses a party that is not in the lists", () => {
    expect(() =>
      getPartyName({
        party: { member_id: "obamas", alias_id: null },
        members,
        aliases,
      }),
    ).toThrow("The party obamas is not in the space");
  });
});
