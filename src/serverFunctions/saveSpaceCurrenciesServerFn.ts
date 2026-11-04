import { currencyFormSchema } from "../core/forms/currencyFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Replaces the space currencies of a space, in one database transaction
 * (PLAN.md, D5, D9). The foreign key of the transactions refuses the remove
 * of a space currency in use.
 */
export const saveSpaceCurrenciesServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(currencyFormSchema.extend({ spaceId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { data: spaceId, error } = await context.db.rpc(
      "save_space_currencies",
      { p_space_id: data.spaceId, p_currencies: data.currencies },
    );
    if (error || !spaceId) {
      throwDatabaseError({
        operation: "saveSpaceCurrenciesServerFn",
        error,
        messages: {
          foreignKeyViolation: "A removed currency has transactions.",
          fallback: "The currencies cannot be saved.",
        },
      });
    }
  });
