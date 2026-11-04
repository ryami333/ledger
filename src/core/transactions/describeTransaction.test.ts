import { describeTransaction } from "./describeTransaction.ts";
import { describe, expect, it } from "vitest";

const members = [
  { id: "barack", name: "Barack", archived_at: null },
  { id: "michelle", name: "Michelle", archived_at: null },
  { id: "donald", name: "Donald", archived_at: null },
  { id: "melania", name: "Melania", archived_at: null },
  { id: "joe", name: "Joe", archived_at: "2026-01-01T00:00:00Z" },
];
const aliases = [{ id: "obamas", name: "Obamas' Shared Account" }];
const aliasMembers = [
  { alias_id: "obamas", member_id: "barack" },
  { alias_id: "obamas", member_id: "michelle" },
];

const member = (side: "paid_by" | "paid_for", memberId: string) => ({
  side,
  member_id: memberId,
  alias_id: null,
});
const alias = (side: "paid_by" | "paid_for", aliasId: string) => ({
  side,
  member_id: null,
  alias_id: aliasId,
});

const describeParties = (
  parties: Parameters<typeof describeTransaction>[0]["parties"],
) =>
  describeTransaction({
    parties,
    members,
    aliases,
    aliasMembers,
    locale: "en-IE",
  });

describe("describeTransaction", () => {
  it("writes 'everyone' when paid for has each member that is not archived", () => {
    expect(
      describeParties([
        alias("paid_by", "obamas"),
        member("paid_for", "barack"),
        member("paid_for", "michelle"),
        member("paid_for", "donald"),
        member("paid_for", "melania"),
      ]),
    ).toBe("Obamas' Shared Account paid for everyone");
  });

  it("counts the members of an alias for 'everyone'", () => {
    expect(
      describeParties([
        member("paid_by", "donald"),
        alias("paid_for", "obamas"),
        member("paid_for", "donald"),
        member("paid_for", "melania"),
      ]),
    ).toBe("Donald paid for everyone");
  });

  it("writes the names in alphabetical order", () => {
    expect(
      describeParties([
        member("paid_by", "michelle"),
        member("paid_by", "barack"),
        member("paid_for", "melania"),
        alias("paid_for", "obamas"),
        member("paid_for", "donald"),
      ]),
    ).toBe("Barack and Michelle paid for everyone");
    expect(
      describeParties([
        member("paid_by", "donald"),
        member("paid_for", "melania"),
        alias("paid_for", "obamas"),
      ]),
    ).toBe("Donald paid for Melania and Obamas' Shared Account");
    expect(
      describeParties([
        member("paid_by", "donald"),
        member("paid_for", "melania"),
        member("paid_for", "michelle"),
        member("paid_for", "barack"),
      ]),
    ).toBe("Donald paid for Barack, Melania and Michelle");
  });

  it("writes the name of a paid-for member who is one person", () => {
    expect(
      describeParties([
        member("paid_by", "donald"),
        member("paid_for", "barack"),
      ]),
    ).toBe("Donald paid for Barack");
  });
});
