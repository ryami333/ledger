/**
 * Writes a camelCase name in snake_case, for example "clientId" as
 * "client_id". A run of capital letters is one word: "requirePKCE" gives
 * "require_pkce".
 */
export const toSnakeCase = (input: string): string =>
  input.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

/**
 * Gives the schema option of a better-auth plugin for one model: the table
 * name and the snake_case column of each field. The tables in
 * `db/schemas/090_better_auth.sql` use these names.
 */
export const snakeCaseModel = <const Field extends string>({
  modelName,
  fields,
}: {
  modelName: string;
  fields: readonly Field[];
}): { modelName: string; fields: Record<Field, string> } => ({
  modelName,
  fields: Object.fromEntries(
    fields.map((field) => [field, toSnakeCase(field)]),
  ) as Record<Field, string>,
});
