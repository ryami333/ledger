import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Deletes a transaction. Its parties go with it (`on delete cascade`). It is
 * a hard delete (PLAN.md, D9).
 */
export const deleteTransactionServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ transactionId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("transactions")
      .delete()
      .eq("id", data.transactionId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "deleteTransactionServerFn",
        error,
        messages: { fallback: "The transaction cannot be deleted." },
      });
    }
  });
