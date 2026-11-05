import { MAX_SLUG_LENGTH } from "../forms/formFieldSchemas.ts";

/**
 * Gives a slug for a title, for example "Trip to Rome 2026" gives
 * "trip-to-rome-2026". It removes the accents of the letters. Each other
 * character that is not a letter or a digit becomes a hyphen. The result
 * can be empty, for example for a title with only emoji.
 */
export const slugifyTitle = (title: string): string =>
  title
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .replaceAll("ß", "ss")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "");
