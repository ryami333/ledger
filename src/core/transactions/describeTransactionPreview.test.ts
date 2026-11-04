import { type PartyRow } from "../balances/splitSide.ts";
import { describeTransactionPreview } from "./describeTransactionPreview.ts";
import { describe, expect, it } from "vitest";

const members = [
  { id: "barack", name: "Barack" },
  { id: "michelle", name: "Michelle" },
  { id: "donald", name: "Donald" },
  { id: "melania", name: "Melania" },
];
const aliases = [{ id: "obamas", name: "Obamas' Shared Account" }];

const member = (memberId: string): PartyRow => ({
  member_id: memberId,
  alias_id: null,
});
const alias = (aliasId: string): PartyRow => ({
  member_id: null,
  alias_id: aliasId,
});
const everyone = members.map((spaceMember) => member(spaceMember.id));

const preview = ({
  amountMinor,
  currency = "EUR",
  paidBy,
  paidFor,
}: {
  amountMinor: bigint;
  currency?: string;
  paidBy: PartyRow[];
  paidFor: PartyRow[];
}) =>
  describeTransactionPreview({
    amountMinor,
    currency,
    locale: "en-IE",
    paidBy,
    paidFor,
    members,
    aliases,
  });

describe("describeTransactionPreview", () => {
  it("writes the example of PLAN.md", () => {
    expect(
      preview({
        amountMinor: 10000n,
        paidBy: [alias("obamas"), member("donald")],
        paidFor: everyone,
      }),
    ).toBe(
      "Obamas' Shared Account and Donald each paid €50.00. Each of 4 members got €25.00.",
    );
  });

  it("writes one party with no 'each'", () => {
    expect(
      preview({
        amountMinor: 4000n,
        currency: "USD",
        paidBy: [member("barack")],
        paidFor: [alias("obamas")],
      }),
    ).toBe("Barack paid US$40.00. Obamas' Shared Account got US$40.00.");
  });

  it("lists the names of three members or fewer", () => {
    expect(
      preview({
        amountMinor: 900n,
        paidBy: [member("donald")],
        paidFor: [member("donald"), member("melania"), member("barack")],
      }),
    ).toBe("Donald paid €9.00. Donald, Melania and Barack each got €3.00.");
  });

  it("gives the smallest and the largest part when the parts differ", () => {
    expect(
      preview({
        amountMinor: 10000n,
        paidBy: [member("donald")],
        paidFor: [member("donald"), member("melania"), member("barack")],
      }),
    ).toBe(
      "Donald paid €100.00. Donald, Melania and Barack each got €33.33 or €33.34.",
    );
  });

  it("omits a side with no party", () => {
    expect(
      preview({ amountMinor: 1000n, paidBy: [member("donald")], paidFor: [] }),
    ).toBe("Donald paid €10.00.");
  });

  it("gives null for an amount that is not positive, or no party", () => {
    expect(
      preview({
        amountMinor: 0n,
        paidBy: [member("donald")],
        paidFor: everyone,
      }),
    ).toBeNull();
    expect(preview({ amountMinor: 1000n, paidBy: [], paidFor: [] })).toBeNull();
  });
});
