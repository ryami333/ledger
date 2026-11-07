import type { MemberBalance } from "../balances/calculateBalances.ts";
import type { AliasMemberRow, TransactionSide } from "../balances/splitSide.ts";

/**
 * One space as the MCP tools read it (PLAN.md, D15). `loadSpace` in
 * `src/server` gives this shape. The rates are texts such as "0.92".
 */
export type McpSpace = {
  space: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
  };
  defaultCurrency: string;
  members: readonly { id: string; name: string; archived_at: string | null }[];
  aliases: readonly { id: string; name: string }[];
  aliasMembers: readonly AliasMemberRow[];
  spaceCurrencies: readonly {
    currency: string;
    rate: string;
    is_default: boolean;
  }[];
  transactions: readonly McpTransaction[];
  balances: readonly MemberBalance[];
};

/** One transaction of an `McpSpace`, with its parties. */
export type McpTransaction = {
  id: string;
  title: string;
  description: string | null;
  amount_minor: bigint;
  currency: string;
  rate: string;
  converted_amount_minor: bigint;
  transaction_date: string;
  parties: readonly {
    side: TransactionSide;
    member_id: string | null;
    alias_id: string | null;
    share_minor: bigint | null;
  }[];
};
