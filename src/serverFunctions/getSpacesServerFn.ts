import { env } from "../env.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";

/**
 * Returns the spaces for the page `/`: the title, the description, the
 * number of members, and the date of the last transaction. The newest space
 * comes first.
 */
export const getSpacesServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { data, error } = await context.db
      .from("spaces")
      .select(
        "id, slug, title, description, members(count), transactions(transaction_date)",
      )
      .order("created_at", { ascending: false })
      .order("transaction_date", {
        referencedTable: "transactions",
        ascending: false,
      })
      .limit(1, { referencedTable: "transactions" });
    if (error) {
      throwDatabaseError({
        operation: "getSpacesServerFn",
        error,
        messages: { fallback: "The spaces cannot be read." },
      });
    }
    return {
      locale: env.APP_LOCALE,
      spaces: (data ?? []).map((space) => ({
        id: space.id,
        slug: space.slug,
        title: space.title,
        description: space.description,
        memberCount: space.members[0]?.count ?? 0,
        lastTransactionDate: space.transactions[0]?.transaction_date ?? null,
      })),
    };
  });
