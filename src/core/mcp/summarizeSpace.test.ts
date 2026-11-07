import type { McpSpace } from "./McpSpace.ts";
import { summarizeSpace } from "./summarizeSpace.ts";
import { summarizeTransaction } from "./summarizeTransaction.ts";
import { describe, expect, it } from "vitest";

const barackId = "00000000-0000-0000-0000-000000000001";
const michelleId = "00000000-0000-0000-0000-000000000002";
const donaldId = "00000000-0000-0000-0000-000000000003";
const obamasId = "00000000-0000-0000-0000-0000000000a1";

const dinner = {
  id: "10000000-0000-0000-0000-000000000001",
  title: "Dinner",
  description: null,
  amount_minor: 4000n,
  currency: "USD",
  rate: "0.92",
  converted_amount_minor: 3680n,
  transaction_date: "2026-11-07",
  parties: [
    {
      side: "paid_by" as const,
      member_id: null,
      alias_id: obamasId,
      share_minor: null,
    },
    {
      side: "paid_for" as const,
      member_id: donaldId,
      alias_id: null,
      share_minor: null,
    },
  ],
};

const space: McpSpace = {
  space: {
    id: "20000000-0000-0000-0000-000000000001",
    slug: "washington",
    title: "Washington",
    description: null,
  },
  defaultCurrency: "EUR",
  members: [
    { id: barackId, name: "Barack", archived_at: null },
    { id: donaldId, name: "Donald", archived_at: null },
    { id: michelleId, name: "Michelle", archived_at: null },
  ],
  aliases: [{ id: obamasId, name: "Obamas' Shared Account" }],
  aliasMembers: [
    { alias_id: obamasId, member_id: barackId },
    { alias_id: obamasId, member_id: michelleId },
  ],
  linkedMembers: [{ user_id: "user-b", member_id: michelleId }],
  spaceCurrencies: [
    { currency: "EUR", rate: "1", is_default: true },
    { currency: "USD", rate: "0.92", is_default: false },
  ],
  transactions: [dinner],
  balances: [
    { member_id: barackId, name: "Barack", balance_minor: 1840n },
    { member_id: michelleId, name: "Michelle", balance_minor: 1840n },
    { member_id: donaldId, name: "Donald", balance_minor: -3680n },
  ],
};

describe("summarizeSpace", () => {
  it("gives the names, the currencies, and the balances as sentences", () => {
    expect(
      summarizeSpace({
        space,
        locale: "en-IE",
        today: "2026-11-07",
        userId: "user-b",
        isDefault: true,
      }),
    ).toEqual({
      slug: "washington",
      title: "Washington",
      description: null,
      default: true,
      today: "2026-11-07",
      you: "Michelle",
      default_currency: "EUR",
      members: [
        { name: "Barack", archived: false },
        { name: "Donald", archived: false },
        { name: "Michelle", archived: false },
      ],
      aliases: [
        { name: "Obamas' Shared Account", members: ["Barack", "Michelle"] },
      ],
      currencies: [
        { code: "EUR", rate: "1", is_default: true },
        { code: "USD", rate: "0.92", is_default: false },
      ],
      transaction_count: 1,
      balances: [
        "Barack is owed €18.40.",
        "Michelle is owed €18.40.",
        "Donald owes €36.80.",
      ],
    });
  });

  it("gives null for you when the user has no linked member", () => {
    expect(
      summarizeSpace({
        space,
        locale: "en-IE",
        today: "2026-11-07",
        userId: "user-a",
        isDefault: false,
      }).you,
    ).toBeNull();
  });
});

describe("summarizeTransaction", () => {
  it("gives the amounts, the names, and the link", () => {
    expect(
      summarizeTransaction({
        transaction: dinner,
        space,
        locale: "en-IE",
        appUrl: "https://ledger.example.com",
      }),
    ).toEqual({
      id: dinner.id,
      date: "2026-11-07",
      title: "Dinner",
      description: null,
      amount: "US$40.00",
      converted_amount: "€36.80",
      rate: "0.92",
      summary: "Obamas' Shared Account paid for Donald",
      paid_by: [{ name: "Obamas' Shared Account", share: null }],
      paid_for: [{ name: "Donald", share: null }],
      link: `https://ledger.example.com/spaces/washington?transaction=${dinner.id}`,
    });
  });
});
