import type { transactionFormSchema } from "../core/forms/transactionFormSchema.ts";
import type { PostgrestDbClient } from "../db/createPostgrestClient.ts";
import { throwDatabaseError } from "./throwDatabaseError.ts";
import type { z } from "zod";

type TransactionValues = z.output<typeof transactionFormSchema>;

/**
 * Writes a party for the jsonb body of `save_transaction`. PostgREST takes a
 * `bigint` as a JSON number. The schema keeps each share at or below the
 * amount, thus below Number.MAX_SAFE_INTEGER.
 */
const toPartyBody = ({
  share_minor: shareMinor,
  ...reference
}: TransactionValues["paid_by"][number]) =>
  shareMinor === null
    ? reference
    : { ...reference, share_minor: Number(shareMinor) };

/**
 * Adds a transaction, or changes a transaction and replaces its parties, in
 * one database transaction (PLAN.md, D9), with the user client. Give `null`
 * as `transactionId` for a new transaction. Returns the ID of the
 * transaction. The transaction keeps the rate of `values` (D5). The
 * transaction form and the MCP tools (D15) use it.
 */
export const saveTransaction = async ({
  db,
  spaceId,
  transactionId,
  values,
}: {
  db: PostgrestDbClient;
  spaceId: string;
  transactionId: string | null;
  values: TransactionValues;
}): Promise<string> => {
  const { data: savedTransactionId, error } = await db.rpc("save_transaction", {
    p_transaction_id: transactionId,
    p_space_id: spaceId,
    p_title: values.title,
    p_description: values.description,
    // The schema keeps the amount below Number.MAX_SAFE_INTEGER.
    p_amount_minor: Number(values.amount_minor),
    p_currency: values.currency,
    p_rate: values.rate,
    p_transaction_date: values.transaction_date.toString(),
    p_paid_by: values.paid_by.map(toPartyBody),
    p_paid_for: values.paid_for.map(toPartyBody),
  });
  if (error || !savedTransactionId) {
    return throwDatabaseError({
      operation: "saveTransaction",
      error,
      messages: { fallback: "The transaction cannot be saved." },
    });
  }
  return savedTransactionId;
};
