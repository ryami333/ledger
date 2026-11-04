import type { TransactionSide } from "../../../core/balances/splitSide.ts";

/** The space on the space page. */
export type SpaceDetails = {
  id: string;
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
 * A space currency on the space page. The rate is the text of `rate::text`.
 * The default currency comes first.
 */
export type SpaceCurrency = {
  currency: string;
  rate: string;
  is_default: boolean;
};

/** One party of a transaction on the space page. */
export type SpaceTransactionParty = {
  side: TransactionSide;
  member_id: string | null;
  alias_id: string | null;
};

/**
 * A transaction on the space page. `transaction_date` is the text
 * `YYYY-MM-DD`, because a `Temporal` object cannot go from the server to the
 * browser. `converted_amount_minor` is the amount in the default currency.
 */
export type SpaceTransaction = {
  id: string;
  title: string;
  description: string | null;
  amount_minor: bigint;
  currency: string;
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
