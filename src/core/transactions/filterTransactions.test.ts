import { filterTransactions } from "./filterTransactions.ts";
import { Temporal } from "temporal-polyfill";
import { describe, expect, it } from "vitest";

const transactions = [
  {
    id: "dinner",
    title: "Dinner at Café Lumière",
    description: null,
    amount_minor: 4476n,
    currency: "EUR",
    converted_amount_minor: 4476n,
    transaction_date: "2026-03-14",
  },
  {
    id: "hotel",
    title: "Hotel",
    description: "Two nights, booking 77-B",
    amount_minor: 123456n,
    currency: "USD",
    converted_amount_minor: 113580n,
    transaction_date: "2026-03-15",
  },
  {
    id: "sushi",
    title: "Sushi",
    description: null,
    amount_minor: 1234n,
    currency: "JPY",
    converted_amount_minor: 760n,
    transaction_date: "2026-03-20",
  },
];

const filterIds = ({
  searchText = "",
  fromDate = null,
  toDate = null,
}: {
  searchText?: string;
  fromDate?: Temporal.PlainDate | null;
  toDate?: Temporal.PlainDate | null;
}) =>
  filterTransactions({
    transactions,
    searchText,
    fromDate,
    toDate,
    defaultCurrency: "EUR",
    locale: "en",
  }).map((transaction) => transaction.id);

describe("filterTransactions", () => {
  it("gives all transactions with no filter", () => {
    expect(filterIds({})).toEqual(["dinner", "hotel", "sushi"]);
    expect(filterIds({ searchText: "   " })).toEqual([
      "dinner",
      "hotel",
      "sushi",
    ]);
  });

  it("finds a text in the title or the description, in any case", () => {
    expect(filterIds({ searchText: "CAFÉ" })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "nights" })).toEqual(["hotel"]);
    expect(filterIds({ searchText: "77-b" })).toEqual(["hotel"]);
    expect(filterIds({ searchText: "taxi" })).toEqual([]);
  });

  it("finds an amount with a point or a comma", () => {
    expect(filterIds({ searchText: "44.76" })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "44,76" })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "1,234.56" })).toEqual(["hotel"]);
    expect(filterIds({ searchText: "1.234,56" })).toEqual(["hotel"]);
  });

  it("finds the converted amount", () => {
    expect(filterIds({ searchText: "1135,80" })).toEqual(["hotel"]);
    expect(filterIds({ searchText: "7.6" })).toEqual(["sushi"]);
  });

  it("finds an amount with an ambiguous separator", () => {
    expect(filterIds({ searchText: "1,234" })).toEqual(["hotel", "sushi"]);
    expect(filterIds({ searchText: "1,234.5" })).toEqual(["hotel"]);
  });

  it("finds an amount that starts with the searched amount", () => {
    expect(filterIds({ searchText: "44" })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "44." })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "44,7" })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "44.760" })).toEqual(["dinner"]);
    expect(filterIds({ searchText: "1234" })).toEqual(["hotel", "sushi"]);
  });

  it("does not find a different whole number or other decimals", () => {
    expect(filterIds({ searchText: "4" })).toEqual([]);
    expect(filterIds({ searchText: "76" })).toEqual([]);
    expect(filterIds({ searchText: "44.8" })).toEqual([]);
    expect(filterIds({ searchText: "44.761" })).toEqual([]);
  });

  it("keeps the transactions in the date range, with both days", () => {
    expect(
      filterIds({
        fromDate: Temporal.PlainDate.from("2026-03-15"),
        toDate: Temporal.PlainDate.from("2026-03-20"),
      }),
    ).toEqual(["hotel", "sushi"]);
    expect(
      filterIds({ toDate: Temporal.PlainDate.from("2026-03-14") }),
    ).toEqual(["dinner"]);
    expect(
      filterIds({
        searchText: "hotel",
        fromDate: Temporal.PlainDate.from("2026-03-16"),
      }),
    ).toEqual([]);
  });
});
