import { transactionFormSchema } from "../core/forms/transactionFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Adds a transaction, or changes a transaction and replaces its parties, in
 * one database transaction (PLAN.md, D9). Give `null` as `transactionId` for
 * a new transaction. Returns the ID of the transaction.
 *
 * `values` is the input of the transaction form, not its output. The output
 * has a `bigint` and a `Temporal.PlainDate`, and the schema does not accept
 * its own output. Thus the server parses the form input with the same schema.
 */
export const saveTransactionServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      spaceId: z.guid(),
      transactionId: z.guid().nullable(),
      values: transactionFormSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const { values } = data;
    const { data: transactionId, error } = await context.db.rpc(
      "save_transaction",
      {
        p_transaction_id: data.transactionId,
        p_space_id: data.spaceId,
        p_title: values.title,
        p_description: values.description,
        // The schema keeps the amount below Number.MAX_SAFE_INTEGER.
        p_amount_minor: Number(values.amount_minor),
        p_currency: values.currency,
        p_transaction_date: values.transaction_date.toString(),
        p_paid_by: values.paid_by,
        p_paid_to: values.paid_to,
      },
    );
    if (error || !transactionId) {
      return throwDatabaseError({
        operation: "saveTransactionServerFn",
        error,
        messages: { fallback: "The transaction cannot be saved." },
      });
    }
    return { transactionId };
  });
