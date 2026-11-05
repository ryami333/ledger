import { spaceFormSchema } from "./spaceFormSchema.ts";
import { z } from "zod";

/** The longest slug. The check `spaces_slug_check` uses the same limit. */
const MAX_SLUG_LENGTH = 100;

/**
 * The slug of a space: the route identifier in `/spaces/<slug>`. It changes
 * capital letters to small letters. The check `spaces_slug_check` accepts
 * the same texts.
 */
export const spaceSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter a slug.")
  .max(MAX_SLUG_LENGTH, `Use ${MAX_SLUG_LENGTH} characters or less.`)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use only letters, digits, and single hyphens between them.",
  );

/** The "Details" form on the settings page of a space. */
export const spaceDetailsFormSchema = spaceFormSchema
  .pick({ title: true, description: true })
  .extend({ slug: spaceSlugSchema });
