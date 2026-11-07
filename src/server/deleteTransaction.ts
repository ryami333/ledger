import type { PostgrestDbClient } from "../db/createPostgrestClient.ts";
import { throwDatabaseError } from "./throwDatabaseError.ts";

/**
 * Deletes a transaction with the user client. Its parties go with it
 * (`on delete cascade`). It is a hard delete (PLAN.md, D9). The transaction
 * drawer and the MCP tools (D15) use it.
 */
export const deleteTransaction = async ({
  db,
  transactionId,
}: {
  db: PostgrestDbClient;
  transactionId: string;
}): Promise<void> => {
  const { data: rows, error } = await db
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .select("id");
  if (error || rows.length === 0) {
    throwDatabaseError({
      operation: "deleteTransaction",
      error,
      messages: { fallback: "The transaction cannot be deleted." },
    });
  }
};
