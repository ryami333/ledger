import { getCurrencyDecimals } from "../money/getCurrencyDecimals.ts";
import { minorToDecimalText } from "../money/minorToDecimalText.ts";
import { parseAmountSearchText } from "./parseAmountSearchText.ts";
import { Temporal } from "temporal-polyfill";

/** The columns of a transaction that the filters read. */
export type FilterableTransaction = {
  title: string;
  description: string | null;
  amount_minor: bigint;
  currency: string;
  converted_amount_minor: bigint;
  /** The text `YYYY-MM-DD`. */
  transaction_date: string;
};

/**
 * Gives `true` when an amount starts with a searched decimal text. The whole
 * part must be equal, and the searched decimals must be the first decimals of
 * the amount. Example: "184" and "184.5" find 184.50, but "18" and "84.5" do
 * not. Zeros after the decimals of the currency are correct: "44.760" finds
 * 44.76.
 */
const isAmountPrefix = ({
  amountText,
  amountMinor,
  decimals,
}: {
  /** A decimal text with a point, from `parseAmountSearchText`. */
  amountText: string;
  amountMinor: bigint;
  decimals: number;
}): boolean => {
  const [searchedWholeText = "", searchedFraction = ""] = amountText.split(".");
  const [wholeText = "", fraction = ""] = minorToDecimalText({
    amountMinor,
    decimals,
  }).split(".");
  const searchedWhole = BigInt(
    searchedWholeText === "" ? "0" : searchedWholeText,
  );
  if (searchedWhole !== BigInt(wholeText)) return false;
  if (/[^0]/.test(searchedFraction.slice(decimals))) return false;
  return fraction.startsWith(searchedFraction.slice(0, decimals));
};

/**
 * Gives the transactions that match the filters of the transaction list, in
 * the same order.
 *
 * - `searchText` matches a transaction when the title or the description
 *   has the text, with no difference between upper case and lower case. It
 *   also matches a transaction when the amount or the converted amount
 *   starts with the searched amount: "184" finds 184.50 (see
 *   `parseAmountSearchText` and `isAmountPrefix`).
 * - `fromDate` and `toDate` include their own day. `null` gives no limit.
 */
export const filterTransactions = <Transaction extends FilterableTransaction>({
  transactions,
  searchText,
  fromDate,
  toDate,
  defaultCurrency,
  locale,
}: {
  transactions: readonly Transaction[];
  searchText: string;
  fromDate: Temporal.PlainDate | null;
  toDate: Temporal.PlainDate | null;
  defaultCurrency: string;
  locale: string;
}): Transaction[] => {
  const needle = searchText.trim().toLocaleLowerCase(locale);
  const amountTexts = parseAmountSearchText(needle);

  /** Gives `true` when this amount starts with one of the amount texts. */
  const isSearchedAmount = ({
    amountMinor,
    currency,
  }: {
    amountMinor: bigint;
    currency: string;
  }) => {
    const decimals = getCurrencyDecimals(currency);
    return amountTexts.some((amountText) =>
      isAmountPrefix({ amountText, amountMinor, decimals }),
    );
  };

  const matchesSearch = (transaction: Transaction) =>
    needle === "" ||
    transaction.title.toLocaleLowerCase(locale).includes(needle) ||
    (transaction.description ?? "")
      .toLocaleLowerCase(locale)
      .includes(needle) ||
    isSearchedAmount({
      amountMinor: transaction.amount_minor,
      currency: transaction.currency,
    }) ||
    isSearchedAmount({
      amountMinor: transaction.converted_amount_minor,
      currency: defaultCurrency,
    });

  const matchesDates = (transaction: Transaction) => {
    const transactionDate = Temporal.PlainDate.from(
      transaction.transaction_date,
    );
    if (
      fromDate !== null &&
      Temporal.PlainDate.compare(transactionDate, fromDate) < 0
    ) {
      return false;
    }
    return (
      toDate === null ||
      Temporal.PlainDate.compare(transactionDate, toDate) <= 0
    );
  };

  return transactions.filter(
    (transaction) => matchesSearch(transaction) && matchesDates(transaction),
  );
};
