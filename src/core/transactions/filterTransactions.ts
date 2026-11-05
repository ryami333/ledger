import { getCurrencyDecimals } from "../money/getCurrencyDecimals.ts";
import { parseDecimalText } from "../money/parseDecimalText.ts";
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
 * Gives the transactions that match the filters of the transaction list, in
 * the same order.
 *
 * - `searchText` matches a transaction when the title or the description
 *   has the text, with no difference between upper case and lower case. It
 *   also matches a transaction when the amount or the converted amount is
 *   the same amount (see `parseAmountSearchText`).
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

  /** Gives `true` when one of the amount texts is this amount. */
  const isSearchedAmount = ({
    amountMinor,
    currency,
  }: {
    amountMinor: bigint;
    currency: string;
  }) => {
    const decimals = getCurrencyDecimals(currency);
    return amountTexts.some(
      (amountText) =>
        parseDecimalText({ text: amountText, decimals }) === amountMinor,
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
