import {
  parsePartyValue,
  toPartyRow,
  toPartyValue,
} from "./partyValueHelpers.ts";
import { describe, expect, it } from "vitest";

const memberId = "a0000000-0000-4000-8000-000000000001";
const aliasId = "c0000000-0000-4000-8000-000000000001";

describe("toPartyValue and parsePartyValue", () => {
  it("writes a party and reads it back", () => {
    const memberValue = toPartyValue({ member_id: memberId, alias_id: null });
    const aliasValue = toPartyValue({ member_id: null, alias_id: aliasId });
    expect(memberValue).toBe(`member:${memberId}`);
    expect(aliasValue).toBe(`alias:${aliasId}`);
    expect(parsePartyValue(memberValue)).toEqual({ member_id: memberId });
    expect(parsePartyValue(aliasValue)).toEqual({ alias_id: aliasId });
  });

  it("gives null for a value that is not a party", () => {
    for (const value of ["", memberId, "member:1", `group:${memberId}`]) {
      expect(parsePartyValue(value), value).toBeNull();
    }
  });
});

describe("toPartyRow", () => {
  it("gives a party row with one ID and one null", () => {
    expect(toPartyRow({ member_id: memberId })).toEqual({
      member_id: memberId,
      alias_id: null,
    });
    expect(toPartyRow({ alias_id: aliasId })).toEqual({
      member_id: null,
      alias_id: aliasId,
    });
  });
});
