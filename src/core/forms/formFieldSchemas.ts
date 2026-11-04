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

/** A currency code that `Intl` knows, for example `EUR`. */
export const currencyCodeSchema = z
  .string()
  .refine(isSupportedCurrency, "Select a currency.");
