import { env } from "../env.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Returns a space for the space page. Phase 5 of PLAN.md adds the members,
 * the transactions, and the balances (D10).
 */
export const getSpaceServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { data: space, error } = await context.db
      .from("spaces")
      .select("id, title, description")
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
    return { locale: env.APP_LOCALE, space };
  });
