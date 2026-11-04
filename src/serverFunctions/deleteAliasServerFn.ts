import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Deletes an alias and its alias members. The foreign key refuses the delete
 * of an alias with transactions (PLAN.md, D7).
 */
export const deleteAliasServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ aliasId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("aliases")
      .delete()
      .eq("id", data.aliasId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "deleteAliasServerFn",
        error,
        messages: {
          foreignKeyViolation: "The alias has transactions.",
          fallback: "The alias cannot be deleted.",
        },
      });
    }
  });
