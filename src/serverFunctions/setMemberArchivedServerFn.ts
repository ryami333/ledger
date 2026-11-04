import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";

/**
 * Archives a member, or makes an archived member active again (PLAN.md, D8).
 * An archived member does not show in the party picker of a new transaction.
 */
export const setMemberArchivedServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ memberId: z.guid(), isArchived: z.boolean() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("members")
      .update({
        archived_at: data.isArchived ? Temporal.Now.instant().toString() : null,
      })
      .eq("id", data.memberId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "setMemberArchivedServerFn",
        error,
        messages: { fallback: "The member cannot be saved." },
      });
    }
  });
