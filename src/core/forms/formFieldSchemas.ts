import { isSupportedCurrency } from "../currencies/isSupportedCurrency.ts";
import { z } from "zod";

/** A text that must not be empty. It removes the spaces at the two ends. */
export const requiredTextSchema = (message: string) =>
  z.string().trim().min(1, message);

/** A text that can be empty. An empty text gives `null`. */
export const optionalTextSchema = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

/** A currency code that `Intl` knows, for example `EUR`. */
export const currencyCodeSchema = z
  .string()
  .refine(isSupportedCurrency, "Select a currency.");
