import { formatRate } from "../core/currencies/formatRate.ts";
import { parseRate } from "../core/currencies/parseRate.ts";
import { env } from "../env.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns a space with its members, aliases, and space currencies, for the
 * settings page. Each row tells if it is in use, because a row in use cannot
 * be deleted (PLAN.md, D5, D7, D8). Each member tells its linked user (D16).
 */
export const getSpaceSettingsServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceSlug: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: space, error } = await context.db
      .from("spaces")
      .select(
        `id, slug, title, description,
        members(id, name, archived_at, transaction_parties(count), alias_members(count)),
        linked_members(user_id, member_id),
        aliases(id, name, alias_members(member_id), transaction_parties(count)),
        space_currencies(currency, rate::text, is_default, transactions(count))`,
      )
      .eq("slug", data.spaceSlug)
      .maybeSingle();
    if (error) {
      return throwDatabaseError({
        operation: "getSpaceSettingsServerFn",
        error,
        messages: { fallback: "The space cannot be read." },
      });
    }
    if (!space) {
      throw notFound();
    }
    const byName = (first: { name: string }, second: { name: string }) =>
      first.name.localeCompare(second.name, env.APP_LOCALE);
    const linkedUserIds = space.linked_members.map(
      (linkedMember) => linkedMember.user_id,
    );
    const { data: linkedUsers, error: usersError } =
      linkedUserIds.length === 0
        ? { data: [], error: null }
        : await context.db
            .from("app_users")
            .select("id, name")
            .in("id", linkedUserIds);
    if (usersError) {
      return throwDatabaseError({
        operation: "getSpaceSettingsServerFn",
        error: usersError,
        messages: { fallback: "The space cannot be read." },
      });
    }
    const userNames = new Map(
      linkedUsers.map((linkedUser) => [linkedUser.id, linkedUser.name]),
    );
    return {
      locale: env.APP_LOCALE,
      space: {
        id: space.id,
        slug: space.slug,
        title: space.title,
        description: space.description,
      },
      members: space.members
        .map((member) => ({
          id: member.id,
          name: member.name,
          isArchived: member.archived_at !== null,
          transactionCount: member.transaction_parties[0]?.count ?? 0,
          aliasCount: member.alias_members[0]?.count ?? 0,
          linkedUser: (() => {
            const userId = space.linked_members.find(
              (linkedMember) => linkedMember.member_id === member.id,
            )?.user_id;
            if (userId === undefined) return null;
            return {
              name: userNames.get(userId) ?? null,
              isCurrentUser: userId === context.userId,
            };
          })(),
        }))
        .toSorted(byName),
      aliases: space.aliases
        .map((alias) => ({
          id: alias.id,
          name: alias.name,
          memberIds: alias.alias_members.map(
            (aliasMember) => aliasMember.member_id,
          ),
          transactionCount: alias.transaction_parties[0]?.count ?? 0,
        }))
        .toSorted(byName),
      // The default currency comes first.
      currencies: space.space_currencies
        .map((spaceCurrency) => ({
          currency: spaceCurrency.currency,
          // The rate input shows "0.92", not the text "0.92000000" of
          // numeric(18, 8).
          rate: (() => {
            const scaledRate = parseRate(spaceCurrency.rate);
            return scaledRate === null
              ? spaceCurrency.rate
              : formatRate(scaledRate);
          })(),
          isDefault: spaceCurrency.is_default,
          transactionCount: spaceCurrency.transactions[0]?.count ?? 0,
        }))
        .toSorted(
          (first, second) =>
            Number(second.isDefault) - Number(first.isDefault) ||
            first.currency.localeCompare(second.currency),
        ),
    };
  });
