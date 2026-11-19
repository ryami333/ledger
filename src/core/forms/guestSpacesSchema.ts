import { z } from "zod";

/**
 * The spaces of a guest (PLAN.md, D20): the IDs of the spaces that the guest
 * can read and change. The list can be empty. A repeated ID counts one time.
 */
export const guestSpacesSchema = z.object({
  space_ids: z
    .array(z.guid())
    .transform((spaceIds) => Array.from(new Set(spaceIds))),
});
