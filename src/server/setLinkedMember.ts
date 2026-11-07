import type { PostgrestDbClient } from "../db/createPostgrestClient.ts";
import { throwDatabaseError } from "./throwDatabaseError.ts";

/**
 * Selects the linked member of the user of `db` in a space, or removes it
 * with `null` (PLAN.md, D16). The settings page and the MCP tool
 * `claim_space_member` use it.
 */
export const setLinkedMember = async ({
  db,
  spaceId,
  memberId,
}: {
  db: PostgrestDbClient;
  spaceId: string;
  memberId: string | null;
}): Promise<void> => {
  const { data, error } = await db.rpc("set_linked_member", {
    p_space_id: spaceId,
    p_member_id: memberId,
  });
  if (error || !data) {
    throwDatabaseError({
      operation: "setLinkedMember",
      error,
      messages: {
        uniqueViolation: "A different user already selected this member.",
        foreignKeyViolation: "The member is not in this space.",
        fallback: "The linked member cannot be saved.",
      },
    });
  }
};
