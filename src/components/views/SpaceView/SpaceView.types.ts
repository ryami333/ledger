import type { TransactionSide } from "../../../core/balances/splitSide.ts";

/** The space on the space page. */
export type SpaceDetails = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

/** A member on the space page, with the columns that `src/core` reads. */
export type SpaceMember = {
  id: string;
  name: string;
  archived_at: string | null;
};

/** An alias on the space page. */
export type SpaceAlias = {
  id: string;
  name: string;
};

/** One row of `alias_members`. */
export type SpaceAliasMember = {
  alias_id: string;
  member_id: string;
};

/**
 * A space currency on the space page. The rate is a text such as "0.92". A
 * new transaction gets this rate. The default currency comes first.
 */
export type SpaceCurrency = {
  currency: string;
  rate: string;
  is_default: boolean;
};

/**
 * One party of a transaction on the space page. `share_minor` is the custom
 * share in minor units of the transaction currency, or `null` for an equal
 * split (PLAN.md, D6).
 */
export type SpaceTransactionParty = {
  side: TransactionSide;
  member_id: string | null;
  alias_id: string | null;
  share_minor: bigint | null;
};

/**
 * A transaction on the space page. `transaction_date` is the text
 * `YYYY-MM-DD`, because a `Temporal` object cannot go from the server to the
 * browser. `rate` is the rate from the save of the transaction, a text such
 * as "0.92" (PLAN.md, D5). `converted_amount_minor` is the amount in the
 * default currency, with this rate.
 */
export type SpaceTransaction = {
  id: string;
  title: string;
  description: string | null;
  amount_minor: bigint;
  currency: string;
  rate: string;
  converted_amount_minor: bigint;
  transaction_date: string;
  parties: SpaceTransactionParty[];
};

/** The balance of one member, in minor units of the default currency. */
export type SpaceBalance = {
  member_id: string;
  name: string;
  balance_minor: bigint;
};

/**
 * The filters of the transaction list, from the search params. The dates are
 * the text `YYYY-MM-DD`, or `null` for no limit. `page` starts at 1.
 */
export type TransactionFilterValues = {
  searchText: string;
  fromDate: string | null;
  toDate: string | null;
  page: number;
};
