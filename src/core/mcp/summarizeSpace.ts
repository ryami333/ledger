import { describeBalance } from "../balances/describeBalance.ts";
import type { McpSpace } from "./McpSpace.ts";

/**
 * Describes a space for the result of the MCP tool `get_space` (PLAN.md,
 * D15): the members, the aliases with their members, the space currencies,
 * and the balances as sentences. `today` is today in `APP_TIME_ZONE`, the
 * default date of a new transaction.
 */
export const summarizeSpace = ({
  space,
  locale,
  today,
}: {
  space: McpSpace;
  locale: string;
  today: string;
}) => {
  const memberNames = new Map(
    space.members.map((member) => [member.id, member.name]),
  );
  return {
    slug: space.space.slug,
    title: space.space.title,
    description: space.space.description,
    today,
    default_currency: space.defaultCurrency,
    members: space.members.map((member) => ({
      name: member.name,
      archived: member.archived_at !== null,
    })),
    aliases: space.aliases.map((alias) => ({
      name: alias.name,
      members: space.aliasMembers
        .filter((aliasMember) => aliasMember.alias_id === alias.id)
        .map((aliasMember) => memberNames.get(aliasMember.member_id) ?? "")
        .filter((name) => name !== ""),
    })),
    currencies: space.spaceCurrencies.map((spaceCurrency) => ({
      code: spaceCurrency.currency,
      rate: spaceCurrency.rate,
      is_default: spaceCurrency.is_default,
    })),
    transaction_count: space.transactions.length,
    balances: space.balances.map((balance) =>
      describeBalance({
        name: balance.name,
        balanceMinor: balance.balance_minor,
        currency: space.defaultCurrency,
        locale,
      }),
    ),
  };
};
