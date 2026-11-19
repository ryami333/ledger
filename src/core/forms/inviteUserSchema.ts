import { emailSchema, requiredTextSchema } from "./formFieldSchemas.ts";
import { guestSpacesSchema } from "./guestSpacesSchema.ts";

/** The longest name of an invited user. */
export const MAX_USER_NAME_LENGTH = 100;

/**
 * The invitation form on `/users` (PLAN.md, D19, rule 4): the name, the
 * email, and the spaces of the guest (D20).
 */
export const inviteUserSchema = guestSpacesSchema.extend({
  name: requiredTextSchema("Enter a name.").max(
    MAX_USER_NAME_LENGTH,
    `Use ${MAX_USER_NAME_LENGTH} characters or less.`,
  ),
  email: emailSchema,
});
