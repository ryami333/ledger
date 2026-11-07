import { calculateBalances } from "../core/balances/calculateBalances.ts";
import { convertAmount } from "../core/currencies/convertAmount.ts";
import { formatRate } from "../core/currencies/formatRate.ts";
import { parseRate } from "../core/currencies/parseRate.ts";
import type { PostgrestDbClient } from "../db/createPostgrestClient.ts";
import { env } from "../env.ts";
import { throwDatabaseError } from "./throwDatabaseError.ts";
import { Temporal } from "temporal-polyfill";

/**
 * Reads a space with the user client: its members, aliases, space
 * currencies, transactions with their parties, and the balances (PLAN.md,
 * D10), and the linked member of each user (D16). Returns null when no
 * space has the slug. The space page and the MCP
 * tools (D15) use it.
 *
 * The transactions are in the order of D11: the newest date first, then the
 * newest `created_at` first. Each transaction has its own rate, from its save
 * (D5). The rates are texts such as "0.92", for the rate input.
 */
export const loadSpace = async ({
  db,
  spaceSlug,
}: {
  db: PostgrestDbClient;
  spaceSlug: string;
}) => {
  const { data: space, error } = await db
    .from("spaces")
    .select(
      `id, slug, title, description,
      members(id, name, archived_at),
      linked_members(user_id, member_id),
      aliases(id, name, alias_members(member_id)),
      space_currencies(currency, rate::text, is_default),
      transactions(id, title, description, amount_minor, currency, rate::text, transaction_date, created_at,
        transaction_parties(side, member_id, alias_id, share_minor))`,
    )
    .eq("slug", spaceSlug)
    .maybeSingle();
  if (error) {
    return throwDatabaseError({
      operation: "loadSpace",
      error,
      messages: { fallback: "The space cannot be read." },
    });
  }
  if (!space) {
    return null;
  }

  const byName = (first: { name: string }, second: { name: string }) =>
    first.name.localeCompare(second.name, env.APP_LOCALE);
  const members = space.members.toSorted(byName);
  const aliases = space.aliases
    .map((alias) => ({ id: alias.id, name: alias.name }))
    .toSorted(byName);
  const aliasMembers = space.aliases.flatMap((alias) =>
    alias.alias_members.map((aliasMember) => ({
      alias_id: alias.id,
      member_id: aliasMember.member_id,
    })),
  );
  /** Gives the scaled rate of a `rate::text`, or throws. */
  const readScaledRate = ({ text, owner }: { text: string; owner: string }) => {
    const scaledRate = parseRate(text);
    if (scaledRate === null) {
      throw new Error(`${owner} has no valid rate.`);
    }
    return scaledRate;
  };
  const spaceCurrencies = space.space_currencies
    .map((spaceCurrency) => ({
      ...spaceCurrency,
      rate: formatRate(
        readScaledRate({
          text: spaceCurrency.rate,
          owner: `The space currency ${spaceCurrency.currency}`,
        }),
      ),
    }))
    .toSorted(
      (first, second) =>
        Number(second.is_default) - Number(first.is_default) ||
        first.currency.localeCompare(second.currency),
    );
  const defaultCurrency = spaceCurrencies.find(
    (spaceCurrency) => spaceCurrency.is_default,
  )?.currency;
  if (defaultCurrency === undefined) {
    throw new Error("The space has no default currency.");
  }

  const transactions = space.transactions
    .toSorted(
      (first, second) =>
        second.transaction_date.localeCompare(first.transaction_date) ||
        Temporal.Instant.compare(
          Temporal.Instant.from(second.created_at),
          Temporal.Instant.from(first.created_at),
        ),
    )
    .map((transaction) => {
      // PostgREST gives a bigint as a JSON number. The transaction form
      // keeps each amount below Number.MAX_SAFE_INTEGER.
      const amountMinor = BigInt(transaction.amount_minor);
      const scaledRate = readScaledRate({
        text: transaction.rate,
        owner: `The transaction ${transaction.id}`,
      });
      return {
        id: transaction.id,
        title: transaction.title,
        description: transaction.description,
        amount_minor: amountMinor,
        currency: transaction.currency,
        rate: formatRate(scaledRate),
        converted_amount_minor: convertAmount({
          amountMinor,
          currency: transaction.currency,
          scaledRate,
          defaultCurrency,
        }),
        transaction_date: transaction.transaction_date,
        parties: transaction.transaction_parties.map((party) => ({
          side: party.side,
          member_id: party.member_id,
          alias_id: party.alias_id,
          share_minor:
            party.share_minor === null ? null : BigInt(party.share_minor),
        })),
      };
    });

  const balances = calculateBalances({
    members,
    aliasMembers,
    defaultCurrency,
    transactions,
    parties: transactions.flatMap((transaction) =>
      transaction.parties.map((party) => ({
        ...party,
        transaction_id: transaction.id,
      })),
    ),
  });

  return {
    defaultCurrency,
    space: {
      id: space.id,
      slug: space.slug,
      title: space.title,
      description: space.description,
    },
    members,
    aliases,
    aliasMembers,
    linkedMembers: space.linked_members,
    spaceCurrencies,
    transactions,
    balances,
  };
};
