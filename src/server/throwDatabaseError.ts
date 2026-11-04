import {
  type DatabaseErrorMessages,
  chooseDatabaseErrorMessage,
} from "../core/errors/chooseDatabaseErrorMessage.ts";

/**
 * Logs the code of a PostgREST error, then throws an error with a text for
 * the user. It does not log the text of the Postgres error, because the text
 * can hold data of the row.
 */
export const throwDatabaseError = ({
  operation,
  error,
  messages,
}: {
  /** A short name for the log, for example "saveMemberServerFn". */
  operation: string;
  error: { code?: string } | null;
  messages: DatabaseErrorMessages;
}): never => {
  console.error(`${operation} failed`, { code: error?.code ?? "no_rows" });
  throw new Error(chooseDatabaseErrorMessage({ code: error?.code, messages }));
};
