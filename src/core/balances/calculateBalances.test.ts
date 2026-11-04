import {
  type BalanceMemberRow,
  type BalancePartyRow,
  type BalanceTransactionRow,
  calculateBalances,
} from "./calculateBalances.ts";
import { describe, expect, it } from "vitest";

const barack = "1-barack";
const donald = "2-donald";
const melania = "3-melania";
const michelle = "4-michelle";
const obamas = "9-obamas";

const members: BalanceMemberRow[] = [
  { id: barack, name: "Barack", archived_at: null },
  { id: donald, name: "Donald", archived_at: null },
  { id: melania, name: "Melania", archived_at: null },
  { id: michelle, name: "Michelle", archived_at: null },
];
const everyone = [barack, donald, melania, michelle];

const aliasMembers = [
  { alias_id: obamas, member_id: barack },
  { alias_id: obamas, member_id: michelle },
];

const spaceCurrencies = [
  { currency: "EUR", rate: "1.00000000", is_default: true },
  { currency: "USD", rate: "0.92000000", is_default: false },
  { currency: "JPY", rate: "0.00613000", is_default: false },
];

/** Makes the rows of one transaction. Each ID can be a member or an alias. */
const makeTransaction = ({
  id,
  amountMinor,
  currency,
  paidBy,
  paidTo,
}: {
  id: string;
  amountMinor: bigint;
  currency: string;
  paidBy: string[];
  paidTo: string[];
}): { transaction: BalanceTransactionRow; parties: BalancePartyRow[] } => {
  const toParty =
    (side: BalancePartyRow["side"]) =>
    (partyId: string): BalancePartyRow => ({
      transaction_id: id,
      side,
      member_id: partyId === obamas ? null : partyId,
      alias_id: partyId === obamas ? obamas : null,
    });
  return {
    transaction: { id, amount_minor: amountMinor, currency },
    parties: [
      ...paidBy.map(toParty("paid_by")),
      ...paidTo.map(toParty("paid_to")),
    ],
  };
};

const calculate = ({
  rows,
  spaceMembers = members,
}: {
  rows: ReturnType<typeof makeTransaction>[];
  spaceMembers?: BalanceMemberRow[];
}) =>
  calculateBalances({
    members: spaceMembers,
    aliasMembers,
    spaceCurrencies,
    transactions: rows.map((row) => row.transaction),
    parties: rows.flatMap((row) => row.parties),
  });

const sumBalances = (balances: ReturnType<typeof calculate>): bigint =>
  balances.reduce(
    (accumulator, balance) => accumulator + balance.balance_minor,
    0n,
  );

describe("calculateBalances", () => {
  it("gives the balances of the example of D6, in the order of D10", () => {
    const balances = calculate({
      rows: [
        makeTransaction({
          id: "t1",
          amountMinor: 10000n,
          currency: "EUR",
          paidBy: [obamas, donald],
          paidTo: everyone,
        }),
      ],
    });
    expect(balances).toEqual([
      { member_id: donald, name: "Donald", balance_minor: 2500n },
      { member_id: melania, name: "Melania", balance_minor: -2500n },
      { member_id: barack, name: "Barack", balance_minor: 0n },
      { member_id: michelle, name: "Michelle", balance_minor: 0n },
    ]);
  });

  it("converts each transaction to the default currency before the split", () => {
    // $40.00 × 0.92 = €36.80. Barack paid it for himself and Donald.
    const balances = calculate({
      rows: [
        makeTransaction({
          id: "t1",
          amountMinor: 4000n,
          currency: "USD",
          paidBy: [barack],
          paidTo: [barack, donald],
        }),
      ],
    });
    expect(balances.slice(0, 2)).toEqual([
      { member_id: barack, name: "Barack", balance_minor: 1840n },
      { member_id: donald, name: "Donald", balance_minor: -1840n },
    ]);
  });

  it("gives balances that sum to zero, also with more than one currency", () => {
    const balances = calculate({
      rows: [
        makeTransaction({
          id: "t1",
          amountMinor: 10001n,
          currency: "EUR",
          paidBy: [obamas, donald],
          paidTo: everyone,
        }),
        makeTransaction({
          id: "t2",
          amountMinor: 3333n,
          currency: "USD",
          paidBy: [melania],
          paidTo: [obamas, donald, melania],
        }),
        makeTransaction({
          id: "t3",
          amountMinor: 12345n,
          currency: "JPY",
          paidBy: [obamas, barack],
          paidTo: [michelle, donald, melania],
        }),
        makeTransaction({
          id: "t4",
          amountMinor: 1n,
          currency: "USD",
          paidBy: [donald],
          paidTo: everyone,
        }),
      ],
    });
    expect(sumBalances(balances)).toBe(0n);
    expect(balances.some((balance) => balance.balance_minor !== 0n)).toBe(true);
  });

  it("sorts the members who are owed, then who owe, then the settled", () => {
    const balances = calculate({
      rows: [
        makeTransaction({
          id: "t1",
          amountMinor: 3000n,
          currency: "EUR",
          paidBy: [michelle],
          paidTo: [donald, melania, michelle],
        }),
        makeTransaction({
          id: "t2",
          amountMinor: 500n,
          currency: "EUR",
          paidBy: [melania],
          paidTo: [donald],
        }),
      ],
    });
    expect(balances.map((balance) => balance.balance_minor)).toEqual([
      2000n,
      -1500n,
      -500n,
      0n,
    ]);
    expect(balances.map((balance) => balance.name)).toEqual([
      "Michelle",
      "Donald",
      "Melania",
      "Barack",
    ]);
  });

  it("hides an archived member with a balance of zero", () => {
    const withArchived: BalanceMemberRow[] = [
      ...members,
      { id: "5-joe", name: "Joe", archived_at: "2026-01-01T00:00:00Z" },
      { id: "6-kamala", name: "Kamala", archived_at: "2026-01-01T00:00:00Z" },
    ];
    const balances = calculate({
      rows: [
        makeTransaction({
          id: "t1",
          amountMinor: 1000n,
          currency: "EUR",
          paidBy: ["5-joe"],
          paidTo: [barack],
        }),
      ],
      spaceMembers: withArchived,
    });
    expect(balances.map((balance) => balance.name)).toEqual([
      "Joe",
      "Barack",
      "Donald",
      "Melania",
      "Michelle",
    ]);
  });

  it("refuses rows that do not agree", () => {
    expect(() =>
      calculate({
        rows: [
          makeTransaction({
            id: "t1",
            amountMinor: 100n,
            currency: "GBP",
            paidBy: [barack],
            paidTo: [donald],
          }),
        ],
      }),
    ).toThrow("The currency GBP of the transaction t1 is not a space currency");
    expect(() =>
      calculate({
        rows: [
          makeTransaction({
            id: "t1",
            amountMinor: 100n,
            currency: "EUR",
            paidBy: ["7-unknown"],
            paidTo: [donald],
          }),
        ],
      }),
    ).toThrow("The member 7-unknown is not in the space");
  });
});
