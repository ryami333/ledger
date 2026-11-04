import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Deletes a member. The foreign keys refuse the delete of a member with
 * transactions or aliases (PLAN.md, D8).
 */
export const deleteMemberServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ memberId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("members")
      .delete()
      .eq("id", data.memberId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "deleteMemberServerFn",
        error,
        messages: {
          foreignKeyViolation:
            "The member has transactions or aliases. Archive the member instead.",
          fallback: "The member cannot be deleted.",
        },
      });
    }
  });
