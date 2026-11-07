import { transactionFormSchema } from "../core/forms/transactionFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { saveTransaction } from "../server/saveTransaction.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Adds or changes a transaction (see `saveTransaction`). Give `null` as
 * `transactionId` for a new transaction. Returns the ID of the transaction.
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
  .handler(async ({ data, context }) => ({
    transactionId: await saveTransaction({
      db: context.db,
      spaceId: data.spaceId,
      transactionId: data.transactionId,
      values: data.values,
    }),
  }));
