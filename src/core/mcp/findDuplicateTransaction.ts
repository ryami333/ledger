/**
 * Finds a transaction with the same date, title, amount, and currency
 * (PLAN.md, D15). A client can send the same tool call two times. The title
 * comparison ignores case and the spaces at the two ends. Returns null when
 * there is no such transaction.
 */
export const findDuplicateTransaction = <
  Transaction extends {
    id: string;
    title: string;
    amount_minor: bigint;
    currency: string;
    transaction_date: string;
  },
>({
  transactions,
  candidate,
  ignoreTransactionId,
}: {
  transactions: readonly Transaction[];
  candidate: {
    title: string;
    amount_minor: bigint;
    currency: string;
    transaction_date: string;
  };
  /** The transaction that the tool changes. It is not a duplicate of itself. */
  ignoreTransactionId: string | null;
}): Transaction | null => {
  const title = candidate.title.trim().toLowerCase();
  return (
    transactions.find(
      (transaction) =>
        transaction.id !== ignoreTransactionId &&
        transaction.transaction_date === candidate.transaction_date &&
        transaction.amount_minor === candidate.amount_minor &&
        transaction.currency === candidate.currency &&
        transaction.title.trim().toLowerCase() === title,
    ) ?? null
  );
};
