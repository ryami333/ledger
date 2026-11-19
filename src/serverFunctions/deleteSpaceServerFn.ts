import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Deletes a space. The foreign keys delete all its rows: the members, the
 * aliases, the space currencies, and the transactions. Only an admin can do
 * this (PLAN.md, D20). RLS refuses a guest. The check here only gives the
 * guest a clear text.
 */
export const deleteSpaceServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceId: z.guid() }))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      setResponseStatus(403);
      throw new Error("Only an admin can delete a space.");
    }
    const { data: rows, error } = await context.db
      .from("spaces")
      .delete()
      .eq("id", data.spaceId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "deleteSpaceServerFn",
        error,
        messages: { fallback: "The space cannot be deleted." },
      });
    }
  });
