import { calculateBalances } from "../core/balances/calculateBalances.ts";
import { convertAmount } from "../core/currencies/convertAmount.ts";
import { parseRate } from "../core/currencies/parseRate.ts";
import { env } from "../env.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

/**
 * Returns a space for the space page: its members, aliases, space
 * currencies, transactions with their parties, and the balances (PLAN.md,
 * D10). It also returns the locale and the default date of a new
 * transaction, because `env.ts` is server only (D11).
 *
 * The transactions are in the order of D11: the newest date first, then the
 * newest `created_at` first.
 */
export const getSpaceServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { data: space, error } = await context.db
      .from("spaces")
      .select(
        `id, title, description,
        members(id, name, archived_at),
        aliases(id, name, alias_members(member_id)),
        space_currencies(currency, rate::text, is_default),
        transactions(id, title, description, amount_minor, currency, transaction_date, created_at,
          transaction_parties(side, member_id, alias_id))`,
      )
      .eq("id", data.spaceId)
      .maybeSingle();
    if (error) {
      return throwDatabaseError({
        operation: "getSpaceServerFn",
        error,
        messages: { fallback: "The space cannot be read." },
      });
    }
    if (!space) {
      throw notFound();
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
    const spaceCurrencies = space.space_currencies.toSorted(
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
    const scaledRates = new Map(
      spaceCurrencies.map((spaceCurrency) => [
        spaceCurrency.currency,
        parseRate(spaceCurrency.rate),
      ]),
    );

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
        const scaledRate = scaledRates.get(transaction.currency);
        if (scaledRate === undefined || scaledRate === null) {
          throw new Error(
            `The transaction ${transaction.id} has a currency with no valid rate.`,
          );
        }
        return {
          id: transaction.id,
          title: transaction.title,
          description: transaction.description,
          amount_minor: amountMinor,
          currency: transaction.currency,
          converted_amount_minor: convertAmount({
            amountMinor,
            currency: transaction.currency,
            scaledRate,
            defaultCurrency,
          }),
          transaction_date: transaction.transaction_date,
          parties: transaction.transaction_parties,
        };
      });

    const balances = calculateBalances({
      members,
      aliasMembers,
      spaceCurrencies,
      transactions,
      parties: transactions.flatMap((transaction) =>
        transaction.parties.map((party) => ({
          ...party,
          transaction_id: transaction.id,
        })),
      ),
    });

    return {
      locale: env.APP_LOCALE,
      defaultTransactionDate: Temporal.Now.plainDateISO(
        env.APP_TIME_ZONE,
      ).toString(),
      defaultCurrency,
      space: {
        id: space.id,
        title: space.title,
        description: space.description,
      },
      members,
      aliases,
      aliasMembers,
      spaceCurrencies,
      transactions,
      balances,
    };
  });
