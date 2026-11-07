import { env } from "../env.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { loadSpace } from "../server/loadSpace.ts";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

/**
 * Returns a space for the space page (see `loadSpace`). It also returns the
 * locale and the default date of a new transaction, because `env.ts` is
 * server only (PLAN.md, D11).
 */
export const getSpaceServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceSlug: z.string() }))
  .handler(async ({ data, context }) => {
    const space = await loadSpace({
      db: context.db,
      spaceSlug: data.spaceSlug,
    });
    if (space === null) {
      throw notFound();
    }
    return {
      locale: env.APP_LOCALE,
      defaultTransactionDate: Temporal.Now.plainDateISO(
        env.APP_TIME_ZONE,
      ).toString(),
      ...space,
    };
  });
