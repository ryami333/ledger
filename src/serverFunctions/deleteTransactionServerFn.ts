import { authMiddleware } from "../server/authMiddleware.ts";
import { deleteTransaction } from "../server/deleteTransaction.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Deletes a transaction (see `deleteTransaction`). */
export const deleteTransactionServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ transactionId: z.guid() }))
  .handler(({ data, context }) =>
    deleteTransaction({ db: context.db, transactionId: data.transactionId }),
  );
