/** The texts for the Postgres error codes that a user can cause. */
export type DatabaseErrorMessages = {
  /** `23505`: a unique constraint refuses the row, for example a name. */
  uniqueViolation?: string;
  /** `23503`: a foreign key refuses the delete of a row in use. */
  foreignKeyViolation?: string;
  /** The text for each other error. */
  fallback: string;
};

/**
 * Chooses the text for the user from the Postgres error code of a PostgREST
 * error. The text of the Postgres error can hold data of the row, thus the UI
 * does not show it.
 */
export const chooseDatabaseErrorMessage = ({
  code,
  messages,
}: {
  code: string | undefined;
  messages: DatabaseErrorMessages;
}): string => {
  if (code === "23505" && messages.uniqueViolation) {
    return messages.uniqueViolation;
  }
  if (code === "23503" && messages.foreignKeyViolation) {
    return messages.foreignKeyViolation;
  }
  return messages.fallback;
};
