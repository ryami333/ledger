import { normalizePartyName, resolvePartyNames } from "./resolvePartyNames.ts";
import { describe, expect, it } from "vitest";

const barack = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Barack",
  archived_at: null,
};
const michelle = {
  id: "00000000-0000-0000-0000-000000000002",
  name: "Michelle",
  archived_at: null,
};
const donald = {
  id: "00000000-0000-0000-0000-000000000003",
  name: "Donald",
  archived_at: null,
};
const melania = {
  id: "00000000-0000-0000-0000-000000000004",
  name: "Melania",
  archived_at: "2026-01-01T00:00:00Z",
};
const members = [barack, michelle, donald, melania];
const obamas = {
  id: "00000000-0000-0000-0000-0000000000a1",
  name: "Obamas' Shared Account",
};
const aliases = [obamas];

describe("normalizePartyName", () => {
  it("ignores case, accents, apostrophes, and extra spaces", () => {
    expect(normalizePartyName("  Obamas’  Shared ACCOUNT ")).toBe(
      "obamas shared account",
    );
    expect(normalizePartyName("Zoë")).toBe("zoe");
  });
});

describe("resolvePartyNames", () => {
  it("finds members and aliases by name", () => {
    expect(
      resolvePartyNames({
        names: ["barack", "Obamas Shared Account"],
        members,
        aliases,
        currentMemberId: null,
      }),
    ).toEqual({
      parties: [{ member_id: barack.id }, { alias_id: obamas.id }],
      usesEveryone: false,
    });
  });

  it("gives each member that is not archived for everyone", () => {
    expect(
      resolvePartyNames({
        names: ["Everyone"],
        members,
        aliases,
        currentMemberId: null,
      }),
    ).toEqual({
      parties: [
        { member_id: barack.id },
        { member_id: michelle.id },
        { member_id: donald.id },
      ],
      usesEveryone: true,
    });
  });

  it("gives a party one time when two names give it", () => {
    expect(
      resolvePartyNames({
        names: ["Donald", "everyone"],
        members,
        aliases,
        currentMemberId: null,
      }),
    ).toEqual({
      parties: [
        { member_id: donald.id },
        { member_id: barack.id },
        { member_id: michelle.id },
      ],
      usesEveryone: true,
    });
  });

  it("gives an error with the names of the space for an unknown name", () => {
    const result = resolvePartyNames({
      names: ["Bob"],
      members,
      aliases,
      currentMemberId: null,
    });
    expect(result).toEqual({
      error: expect.stringContaining('"Bob"'),
    });
    expect("error" in result && result.error).toContain(
      "Barack, Michelle, Donald, Obamas' Shared Account",
    );
    expect("error" in result && result.error).not.toContain("Melania");
  });

  it("gives an error for a name of a member and of an alias", () => {
    expect(
      resolvePartyNames({
        names: ["Barack"],
        members,
        aliases: [{ id: obamas.id, name: "barack" }],
        currentMemberId: null,
      }),
    ).toEqual({ error: expect.stringContaining("member and of an alias") });
  });

  it("uses a member with the name everyone, not all members", () => {
    const everyoneMember = { ...donald, name: "Everyone" };
    expect(
      resolvePartyNames({
        names: ["everyone"],
        members: [barack, everyoneMember],
        aliases: [],
        currentMemberId: null,
      }),
    ).toEqual({
      parties: [{ member_id: everyoneMember.id }],
      usesEveryone: false,
    });
  });

  it("gives the linked member of the current user for me", () => {
    expect(
      resolvePartyNames({
        names: ["Shan", "me"],
        members: [...members, { id: "shan", name: "Shan", archived_at: null }],
        aliases,
        currentMemberId: donald.id,
      }),
    ).toEqual({
      parties: [{ member_id: "shan" }, { member_id: donald.id }],
      usesEveryone: false,
    });
    for (const name of ["I", "Myself", "you"]) {
      expect(
        resolvePartyNames({
          names: [name],
          members,
          aliases,
          currentMemberId: barack.id,
        }),
      ).toEqual({ parties: [{ member_id: barack.id }], usesEveryone: false });
    }
  });

  it("asks for claim_space_member when the user has no linked member", () => {
    expect(
      resolvePartyNames({
        names: ["me"],
        members,
        aliases,
        currentMemberId: null,
      }),
    ).toEqual({ error: expect.stringContaining("claim_space_member") });
  });

  it("uses a member with the name Me, not the linked member", () => {
    const meMember = { ...michelle, name: "Me" };
    expect(
      resolvePartyNames({
        names: ["me"],
        members: [barack, meMember],
        aliases: [],
        currentMemberId: barack.id,
      }),
    ).toEqual({ parties: [{ member_id: meMember.id }], usesEveryone: false });
  });
});
