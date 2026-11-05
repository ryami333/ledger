import { splitSide } from "./splitSide.ts";
import { describe, expect, it } from "vitest";

// The IDs sort in this order: barack, donald, melania, michelle.
const barack = "1-barack";
const donald = "2-donald";
const melania = "3-melania";
const michelle = "4-michelle";
const obamas = "9-obamas";

const aliasMembers = [
  { alias_id: obamas, member_id: michelle },
  { alias_id: obamas, member_id: barack },
];

const memberParty = (memberId: string) => ({
  member_id: memberId,
  alias_id: null,
});
const aliasParty = (aliasId: string) => ({
  member_id: null,
  alias_id: aliasId,
});

const sumShares = (shares: Map<string, bigint>): bigint =>
  [...shares.values()].reduce((accumulator, share) => accumulator + share, 0n);

describe("splitSide", () => {
  it("gives an alias one part, then splits it among its members", () => {
    // PLAN.md, D6: the alias paid €50.00, Donald paid €50.00.
    expect(
      splitSide({
        amountMinor: 10000n,
        parties: [aliasParty(obamas), memberParty(donald)],
        aliasMembers,
      }),
    ).toEqual(
      new Map([
        [barack, 2500n],
        [donald, 5000n],
        [michelle, 2500n],
      ]),
    );
  });

  it("gives both shares to a member on the side two times", () => {
    // PLAN.md, D6, rule 3: Barack paid €75.00, Michelle paid €25.00.
    expect(
      splitSide({
        amountMinor: 10000n,
        parties: [aliasParty(obamas), memberParty(barack)],
        aliasMembers,
      }),
    ).toEqual(
      new Map([
        [barack, 7500n],
        [michelle, 2500n],
      ]),
    );
  });

  it("gives the remainder to the first recipients by ID", () => {
    expect(
      splitSide({
        amountMinor: 100n,
        parties: [
          memberParty(melania),
          memberParty(donald),
          memberParty(barack),
        ],
        aliasMembers,
      }),
    ).toEqual(
      new Map([
        [barack, 34n],
        [donald, 33n],
        [melania, 33n],
      ]),
    );
  });

  it("gives the remainder of an alias part to its first members by ID", () => {
    // €1.02 to Donald and the alias: each gets 51. The alias then gives 26
    // to Barack and 25 to Michelle.
    expect(
      splitSide({
        amountMinor: 102n,
        parties: [memberParty(donald), aliasParty(obamas)],
        aliasMembers,
      }),
    ).toEqual(
      new Map([
        [barack, 26n],
        [donald, 51n],
        [michelle, 25n],
      ]),
    );
  });

  it("sums each side to the amount exactly", () => {
    const sides = [
      [memberParty(barack)],
      [aliasParty(obamas)],
      [aliasParty(obamas), memberParty(barack)],
      [memberParty(barack), memberParty(donald), memberParty(melania)],
      [
        aliasParty(obamas),
        memberParty(donald),
        memberParty(melania),
        memberParty(michelle),
      ],
    ];
    for (const parties of sides) {
      for (const amountMinor of [0n, 1n, 2n, 3n, 7n, 100n, 101n, 99999n]) {
        expect(
          sumShares(splitSide({ amountMinor, parties, aliasMembers })),
        ).toBe(amountMinor);
      }
    }
  });

  it("gives the same result for each order of the input", () => {
    const parties = [
      memberParty(melania),
      aliasParty(obamas),
      memberParty(donald),
    ];
    const expected = splitSide({ amountMinor: 1001n, parties, aliasMembers });
    const orders = [
      [parties[2], parties[0], parties[1]],
      [parties[1], parties[2], parties[0]],
      parties.toReversed(),
    ];
    for (const order of orders) {
      const result = splitSide({
        amountMinor: 1001n,
        parties: order.filter((party) => party !== undefined),
        aliasMembers: aliasMembers.toReversed(),
      });
      expect([...result]).toEqual([...expected]);
    }
  });

  it("refuses an empty side and an alias with no members", () => {
    expect(() =>
      splitSide({ amountMinor: 100n, parties: [], aliasMembers }),
    ).toThrow("A side needs one or more parties");
    expect(() =>
      splitSide({
        amountMinor: 100n,
        parties: [aliasParty("8-empty")],
        aliasMembers,
      }),
    ).toThrow("The alias 8-empty has no members");
  });

  describe("with custom shares", () => {
    const sharedParty = (memberId: string, shareMinor: bigint) => ({
      member_id: memberId,
      alias_id: null,
      share_minor: shareMinor,
    });

    it("gives each party its share when the amount is the share total", () => {
      expect(
        splitSide({
          amountMinor: 10000n,
          parties: [sharedParty(barack, 4000n), sharedParty(donald, 6000n)],
          aliasMembers,
        }),
      ).toEqual(
        new Map([
          [barack, 4000n],
          [donald, 6000n],
        ]),
      );
    });

    it("splits a converted amount in proportion to the shares", () => {
      // A share total of 100.00 USD gives a converted amount of 92.00 EUR.
      const shares = splitSide({
        amountMinor: 9200n,
        parties: [sharedParty(barack, 3333n), sharedParty(donald, 6667n)],
        aliasMembers,
      });
      expect(shares).toEqual(
        new Map([
          [barack, 3066n],
          [donald, 6134n],
        ]),
      );
      expect(sumShares(shares)).toBe(9200n);
    });

    it("splits the share of an alias equally among its members", () => {
      expect(
        splitSide({
          amountMinor: 10000n,
          parties: [
            { member_id: null, alias_id: obamas, share_minor: 7001n },
            sharedParty(donald, 2999n),
          ],
          aliasMembers,
        }),
      ).toEqual(
        new Map([
          [barack, 3501n],
          [donald, 2999n],
          [michelle, 3500n],
        ]),
      );
    });

    it("gives the units that are left to the largest rests", () => {
      // 100 × 1/6 = 16.67, 100 × 2/6 = 33.33, 100 × 3/6 = 50.
      const shares = splitSide({
        amountMinor: 100n,
        parties: [
          sharedParty(barack, 1n),
          sharedParty(donald, 2n),
          sharedParty(melania, 3n),
        ],
        aliasMembers,
      });
      expect(shares).toEqual(
        new Map([
          [barack, 17n],
          [donald, 33n],
          [melania, 50n],
        ]),
      );
    });

    it("refuses a side that mixes custom shares and equal parts", () => {
      expect(() =>
        splitSide({
          amountMinor: 100n,
          parties: [sharedParty(barack, 50n), memberParty(donald)],
          aliasMembers,
        }),
      ).toThrow("A side needs a share for each party or for no party");
    });

    it("refuses a share of zero", () => {
      expect(() =>
        splitSide({
          amountMinor: 100n,
          parties: [sharedParty(barack, 0n), sharedParty(donald, 100n)],
          aliasMembers,
        }),
      ).toThrow("A share must be larger than zero");
    });
  });
});
