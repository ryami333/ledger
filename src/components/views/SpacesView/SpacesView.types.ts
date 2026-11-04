/** One space on the page `/`. */
export type SpaceSummary = {
  id: string;
  title: string;
  description: string | null;
  memberCount: number;
  /** The date of the last transaction, as `YYYY-MM-DD`, or null. */
  lastTransactionDate: string | null;
};
