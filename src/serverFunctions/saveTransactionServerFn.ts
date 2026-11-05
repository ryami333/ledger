import { transactionFormSchema } from "../core/forms/transactionFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Writes a party for the jsonb body of `save_transaction`. PostgREST takes a
 * `bigint` as a JSON number. The schema keeps each share at or below the
 * amount, thus below Number.MAX_SAFE_INTEGER.
 */
const toPartyBody = ({
  share_minor: shareMinor,
  ...reference
}: z.output<typeof transactionFormSchema>["paid_by"][number]) =>
  shareMinor === null
    ? reference
    : { ...reference, share_minor: Number(shareMinor) };

/**
 * Adds a transaction, or changes a transaction and replaces its parties, in
 * one database transaction (PLAN.md, D9). Give `null` as `transactionId` for
 * a new transaction. Returns the ID of the transaction. The transaction keeps
 * the rate of the form (PLAN.md, D5).
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
        p_rate: values.rate,
        p_transaction_date: values.transaction_date.toString(),
        p_paid_by: values.paid_by.map(toPartyBody),
        p_paid_for: values.paid_for.map(toPartyBody),
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
