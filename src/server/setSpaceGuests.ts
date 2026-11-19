import type { PostgrestDbClient } from "../db/createPostgrestClient.ts";
import { throwDatabaseError } from "./throwDatabaseError.ts";

/**
 * Replaces the spaces of a guest (PLAN.md, D20). RLS lets only an admin
 * change them. The invitation and "Edit Spaces" on `/users` use it.
 */
export const setSpaceGuests = async ({
  db,
  userId,
  spaceIds,
}: {
  db: PostgrestDbClient;
  userId: string;
  spaceIds: string[];
}): Promise<void> => {
  const { data, error } = await db.rpc("set_space_guests", {
    p_user_id: userId,
    p_space_ids: spaceIds,
  });
  if (error || !data) {
    throwDatabaseError({
      operation: "setSpaceGuests",
      error,
      messages: {
        foreignKeyViolation: "A space does not exist. Load the page again.",
        fallback: "The spaces of the guest cannot be saved.",
      },
    });
  }
};
