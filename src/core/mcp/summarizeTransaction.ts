import { formatAmount } from "../money/formatAmount.ts";
import { describeTransaction } from "../transactions/describeTransaction.ts";
import { getPartyName } from "../transactions/getPartyName.ts";
import type { McpSpace, McpTransaction } from "./McpSpace.ts";

/**
 * Describes one transaction for the result of an MCP tool (PLAN.md, D15):
 * the amounts as texts, the names of the parties, the list line of the UI,
 * and the link to the transaction drawer.
 */
export const summarizeTransaction = ({
  transaction,
  space,
  locale,
  appUrl,
}: {
  transaction: McpTransaction;
  space: McpSpace;
  locale: string;
  appUrl: string;
}) => {
  const describeSide = (side: "paid_by" | "paid_for") =>
    transaction.parties
      .filter((party) => party.side === side)
      .map((party) => ({
        name: getPartyName({
          party,
          members: space.members,
          aliases: space.aliases,
        }),
        share:
          party.share_minor === null
            ? null
            : formatAmount({
                amountMinor: party.share_minor,
                currency: transaction.currency,
                locale,
              }),
      }));
  const link = new URL(`/spaces/${space.space.slug}`, appUrl);
  link.searchParams.set("transaction", transaction.id);
  return {
    id: transaction.id,
    date: transaction.transaction_date,
    title: transaction.title,
    description: transaction.description,
    amount: formatAmount({
      amountMinor: transaction.amount_minor,
      currency: transaction.currency,
      locale,
    }),
    converted_amount:
      transaction.currency === space.defaultCurrency
        ? null
        : formatAmount({
            amountMinor: transaction.converted_amount_minor,
            currency: space.defaultCurrency,
            locale,
          }),
    rate: transaction.rate,
    summary: describeTransaction({
      parties: transaction.parties,
      members: space.members,
      aliases: space.aliases,
      aliasMembers: space.aliasMembers,
      locale,
    }),
    paid_by: describeSide("paid_by"),
    paid_for: describeSide("paid_for"),
    link: link.href,
  };
};
