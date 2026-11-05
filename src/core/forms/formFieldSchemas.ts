import { isSupportedCurrency } from "../currencies/isSupportedCurrency.ts";
import { z } from "zod";

/** A text that must not be empty. It removes the spaces at the two ends. */
export const requiredTextSchema = (message: string) =>
  z.string().trim().min(1, message);

/**
 * A text that can be empty. An empty text gives `null`. The schema also
 * accepts `null`, thus the output of a form schema is a valid input again.
 * A server function then validates the output of the form with the same
 * schema.
 */
export const optionalTextSchema = z
  .string()
  .trim()
  .nullable()
  .transform((value) => (value === null || value === "" ? null : value));

/** The longest slug. The check `spaces_slug_check` uses the same limit. */
export const MAX_SLUG_LENGTH = 100;

/**
 * The slug of a space: the route identifier in `/spaces/<slug>`. It changes
 * capital letters to small letters. The check `spaces_slug_check` accepts
 * the same texts.
 */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter a slug.")
  .max(MAX_SLUG_LENGTH, `Use ${MAX_SLUG_LENGTH} characters or less.`)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use only letters, digits, and single hyphens between them.",
  );

/** A currency code that `Intl` knows, for example `EUR`. */
export const currencyCodeSchema = z
  .string()
  .refine(isSupportedCurrency, "Select a currency.");
