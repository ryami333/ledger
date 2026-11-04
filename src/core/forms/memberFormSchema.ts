import { requiredTextSchema } from "./formFieldSchemas.ts";
import { z } from "zod";

/**
 * The form to add or rename a member. The database refuses a name that
 * another member of the space has (PLAN.md, D8).
 */
export const memberFormSchema = z.object({
  name: requiredTextSchema("Enter a name."),
});
