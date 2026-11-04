import { requiredTextSchema } from "./formFieldSchemas.ts";
import { z } from "zod";

/**
 * The alias form. The output has the parameters of `save_alias` (PLAN.md,
 * D9). An alias has one or more members (D7).
 */
export const aliasFormSchema = z.object({
  name: requiredTextSchema("Enter a name."),
  member_ids: z
    .array(z.guid())
    .min(1, "Select one or more members.")
    .refine(
      (memberIds) => new Set(memberIds).size === memberIds.length,
      "Select each member one time only.",
    ),
});
