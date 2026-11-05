import { z } from "zod";

/**
 * The form of the CSV import (Splid export). `memberIds` gives the space
 * member of each name of the export, in the order of the export. Each name
 * needs a different member.
 */
export const splidImportFormSchema = z.object({
  memberIds: z
    .array(z.guid("Select a member."))
    .min(1, "The export has no members.")
    .refine(
      (memberIds) => new Set(memberIds).size === memberIds.length,
      "Select a different member for each name.",
    ),
});
