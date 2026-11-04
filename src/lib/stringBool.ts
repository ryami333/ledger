/**
 * Gives the text `"true"` or `"false"` for a boolean `data-*` attribute. The
 * CSS then selects `[data-name="true"]` or `[data-name="false"]`.
 */
export const stringBool = (
  input: boolean | undefined | null,
): "true" | "false" => (input ? "true" : "false");
