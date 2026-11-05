import { parseSplidExport } from "./parseSplidExport.ts";
import {
  SPLID_IMPORT_DESCRIPTION,
  planSplidImport,
} from "./planSplidImport.ts";
import { describe, expect, it } from "vitest";

const MITCH = "member-mitch";
const SHAN = "member-shan";

const readExport = (rows: string[]) => {
  const result = parseSplidExport(
    [
      "Shmitch on tour — 4 November 2026,,,,,,,,,",
      "Title,Amount,Currency,By,Date,Created on,Mitch,,Shannon,",
      ...rows,
    ].join("\n"),
  );
  if ("error" in result) throw new Error(result.error);
  return result.splidExport;
};

const plan = ({
  rows,
  memberIds = [MITCH, SHAN],
  spaceCurrencies = ["EUR"],
  existingTransactions = [],
}: {
  rows: string[];
  memberIds?: (string | null)[];
  spaceCurrencies?: string[];
  existingTransactions?: Parameters<
    typeof planSplidImport
  >[0]["existingTransactions"];
}) =>
  planSplidImport({
    splidExport: readExport(rows),
    memberIds,
    defaultCurrency: "EUR",
    spaceCurrencies,
    existingTransactions,
  });

const equal = (memberId: string) => ({
  member_id: memberId,
  alias_id: null,
  share_minor: null,
});

describe("planSplidImport", () => {
  it("gives an equal split for parts that differ by one cent", () => {
    expect(
      plan({
        rows: [
          "SIN-KLA flights,187.27,EUR,Mitch,–,03/10/2024,187.27,-93.64,,-93.64",
        ],
      }),
    ).toEqual({
      transactions: [
        {
          lineNumber: 3,
          title: "SIN-KLA flights",
          description: SPLID_IMPORT_DESCRIPTION,
          amount_minor: 18727n,
          currency: "EUR",
          rate: "1",
          transaction_date: "2024-10-03",
          paid_by: [equal(MITCH)],
          paid_for: [equal(MITCH), equal(SHAN)],
        },
      ],
      newCurrencies: [],
      duplicateCount: 0,
      problems: [],
    });
  });

  it("reads an amount with no zero before the point", () => {
    const result = plan({
      rows: ["Cash,1.52,EUR,Shannon,–,01/04/2026,,-.76,1.52,-.76"],
    });
    expect(result.problems).toEqual([]);
    expect(result.transactions[0]?.paid_for).toEqual([
      equal(MITCH),
      equal(SHAN),
    ]);
  });

  it("uses the column Date before the column Created on", () => {
    const result = plan({
      rows: ["Aldi,34.26,EUR,Mitch,29/10/2026,04/11/2026,34.26,-17.13,,-17.13"],
    });
    expect(result.transactions[0]?.transaction_date).toBe("2026-10-29");
  });

  it("gives custom shares to unequal payers and recipients", () => {
    const result = plan({
      rows: [
        "Ksenia,60.00,EUR,Shannon & 1,11/09/2025,12/09/2025,50.00,-30.00,10.00,-30.00",
        "Shan's Rayban's,129.00,EUR,Mitch & 1,–,08/02/2025,64.50,,64.50,-129.00",
      ],
    });
    expect(
      result.transactions.map((transaction) => transaction.paid_by),
    ).toEqual([
      [
        { member_id: MITCH, alias_id: null, share_minor: 5000n },
        { member_id: SHAN, alias_id: null, share_minor: 1000n },
      ],
      [equal(MITCH), equal(SHAN)],
    ]);
    expect(result.transactions[1]?.paid_for).toEqual([equal(SHAN)]);
  });

  it("adds a new currency with the rate from the member amounts", () => {
    const result = plan({
      rows: [
        "Similan islands,3700.00,THB,Shannon,–,25/02/2025,,-97.12,97.12,",
        "Thai cooking class,3000.00,THB,Mitch,01/03/2025,01/03/2025,78.75,,,-78.75",
        "Laundry,44000.00,IDR,Shannon,10/05/2026,11/05/2026,,-1.08,2.16,-1.08",
      ],
    });
    expect(result.problems).toEqual([]);
    expect(result.newCurrencies).toEqual([
      { currency: "IDR", rate: "0.00004909" },
      { currency: "THB", rate: "0.02624925" },
    ]);
    expect(
      result.transactions.map((transaction) => transaction.amount_minor),
    ).toEqual([370000n, 300000n, 44000n]);
  });

  it("gives each transaction the rate of its own member amounts", () => {
    const result = plan({
      rows: [
        "Similan islands,3700.00,THB,Shannon,–,25/02/2025,,-97.12,97.12,",
        "Thai cooking class,3000.00,THB,Mitch,01/03/2025,01/03/2025,78.75,,,-78.75",
        "Laundry,44000.00,IDR,Shannon,10/05/2026,11/05/2026,,-1.08,2.16,-1.08",
      ],
      spaceCurrencies: ["EUR", "THB"],
    });
    expect(result.transactions.map((transaction) => transaction.rate)).toEqual([
      "0.02624865",
      "0.02625",
      "0.00004909",
    ]);
  });

  it("converts unequal parts of a foreign amount to shares of that amount", () => {
    const result = plan({
      rows: [
        "Soapmaking,550000.00,IDR,Mitch & 1,–,14/05/2026,15.95,-27.00,11.04,",
      ],
    });
    expect(result.transactions[0]?.paid_by).toEqual([
      { member_id: MITCH, alias_id: null, share_minor: 325028n },
      { member_id: SHAN, alias_id: null, share_minor: 224972n },
    ]);
    expect(result.transactions[0]?.paid_for).toEqual([equal(MITCH)]);
  });

  it("keeps the rate of a currency that the space has", () => {
    const result = plan({
      rows: ["Similan islands,3700.00,THB,Shannon,–,25/02/2025,,-97.12,97.12,"],
      spaceCurrencies: ["EUR", "THB"],
    });
    expect(result.newCurrencies).toEqual([]);
    expect(result.transactions).toHaveLength(1);
  });

  it("skips one row for each transaction that the space has", () => {
    const row =
      "Aldi,34.26,EUR,Mitch,29/10/2026,04/11/2026,34.26,-17.13,,-17.13";
    const result = plan({
      rows: [row, row],
      existingTransactions: [
        {
          title: "Aldi ",
          amount_minor: 3426n,
          currency: "EUR",
          transaction_date: "2026-10-29",
        },
      ],
    });
    expect(result.duplicateCount).toBe(1);
    expect(result.transactions).toHaveLength(1);
  });

  it("gives a problem for a row that it cannot import", () => {
    const result = plan({
      rows: [
        "Bad date,10.00,EUR,Mitch,31/02/2025,,10.00,-5.00,,-5.00",
        "Bad currency,10.00,XYZ,Mitch,–,01/02/2025,10.00,-5.00,,-5.00",
        "Not in sum,10.00,EUR,Mitch,–,01/02/2025,9.00,-5.00,,-5.00",
        "No payer,10.00,EUR,Mitch,–,01/02/2025,,-5.00,,-5.00",
        "Good,10.00,EUR,Mitch,–,01/02/2025,10.00,-5.00,,-5.00",
      ],
    });
    expect(result.problems.map((problem) => problem.title)).toEqual([
      "Bad date",
      "Bad currency",
      "Not in sum",
      "No payer",
    ]);
    expect(result.transactions.map((transaction) => transaction.title)).toEqual(
      ["Good"],
    );
  });

  it("gives a problem for an amount of a name with no member", () => {
    const result = plan({
      rows: [
        "Shared,10.00,EUR,Mitch,–,01/02/2025,10.00,-5.00,,-5.00",
        "Mitch only,10.00,EUR,Mitch,–,01/02/2025,10.00,-10.00,,",
      ],
      memberIds: [MITCH, null],
    });
    expect(result.problems).toEqual([
      {
        lineNumber: 3,
        title: "Shared",
        message: "Shannon has no member in the space.",
      },
    ]);
    expect(result.transactions.map((transaction) => transaction.title)).toEqual(
      ["Mitch only"],
    );
  });
});
