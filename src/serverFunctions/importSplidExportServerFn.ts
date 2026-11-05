import { splidImportFormSchema } from "../core/forms/splidImportFormSchema.ts";
import { parseSplidExport } from "../core/imports/parseSplidExport.ts";
import {
  type ImportParty,
  planSplidImport,
} from "../core/imports/planSplidImport.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** The largest CSV text: 5 million characters. */
const MAX_CSV_LENGTH = 5_000_000;

/**
 * Writes a party for the jsonb body of `import_transactions`. PostgREST
 * takes a `bigint` as a JSON number. The plan keeps each amount at or below
 * Number.MAX_SAFE_INTEGER.
 */
const toPartyBody = ({ share_minor: shareMinor, ...reference }: ImportParty) =>
  shareMinor === null
    ? reference
    : { ...reference, share_minor: Number(shareMinor) };

/**
 * Imports the transactions of a Splid export into a space, in one database
 * transaction (PLAN.md, D9). The server reads the space again, and plans the
 * import with `planSplidImport`.
 *
 * With `isDryRun`, it writes nothing and returns the plan: the number of
 * transactions, the duplicates, the new currencies, and the problems.
 * Without it, it also imports the transactions.
 */
export const importSplidExportServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    splidImportFormSchema.extend({
      spaceId: z.guid(),
      csvText: z.string().max(MAX_CSV_LENGTH, "The file is too large."),
      isDryRun: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const parsed = parseSplidExport(data.csvText);
    if ("error" in parsed) {
      throw new Error(parsed.error);
    }
    const { splidExport } = parsed;
    if (data.memberIds.length !== splidExport.memberNames.length) {
      throw new Error("Select a member for each name of the export.");
    }

    // The transactions are an embed, because PGRST_DB_MAX_ROWS limits a
    // query of the transactions table.
    const { data: space, error } = await context.db
      .from("spaces")
      .select(
        `id,
        members(id, archived_at),
        space_currencies(currency, is_default),
        transactions(title, amount_minor, currency, transaction_date)`,
      )
      .eq("id", data.spaceId)
      .maybeSingle();
    if (error) {
      return throwDatabaseError({
        operation: "importSplidExportServerFn",
        error,
        messages: { fallback: "The space cannot be read." },
      });
    }
    if (!space) {
      throw notFound();
    }

    const activeMemberIds = new Set(
      space.members.flatMap((member) =>
        member.archived_at === null ? [member.id] : [],
      ),
    );
    if (!data.memberIds.every((memberId) => activeMemberIds.has(memberId))) {
      throw new Error("Select an active member of the space for each name.");
    }
    const defaultCurrency = space.space_currencies.find(
      (spaceCurrency) => spaceCurrency.is_default,
    )?.currency;
    if (defaultCurrency === undefined) {
      throw new Error("The space has no default currency.");
    }

    const plan = planSplidImport({
      splidExport,
      memberIds: data.memberIds,
      defaultCurrency,
      spaceCurrencies: space.space_currencies.map(
        (spaceCurrency) => spaceCurrency.currency,
      ),
      // PostgREST gives a bigint as a JSON number.
      existingTransactions: space.transactions.map((transaction) => ({
        ...transaction,
        amount_minor: BigInt(transaction.amount_minor),
      })),
    });
    const summary = {
      transactionCount: plan.transactions.length,
      duplicateCount: plan.duplicateCount,
      newCurrencies: plan.newCurrencies,
      problems: plan.problems,
      defaultCurrency,
    };
    if (data.isDryRun || plan.transactions.length === 0) {
      return { ...summary, importedCount: 0 };
    }

    const { data: importedCount, error: importError } = await context.db.rpc(
      "import_transactions",
      {
        p_space_id: data.spaceId,
        p_currencies: plan.newCurrencies,
        p_transactions: plan.transactions.map((transaction) => ({
          title: transaction.title,
          description: transaction.description,
          amount_minor: Number(transaction.amount_minor),
          currency: transaction.currency,
          transaction_date: transaction.transaction_date,
          paid_by: transaction.paid_by.map(toPartyBody),
          paid_for: transaction.paid_for.map(toPartyBody),
        })),
      },
    );
    if (importError || importedCount === null) {
      return throwDatabaseError({
        operation: "importSplidExportServerFn",
        error: importError,
        messages: { fallback: "The transactions cannot be imported." },
      });
    }
    console.info("importSplidExportServerFn imported", {
      spaceId: data.spaceId,
      importedCount,
    });
    return { ...summary, importedCount };
  });
