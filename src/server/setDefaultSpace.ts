import type { PostgrestDbClient } from "../db/createPostgrestClient.ts";
import { throwDatabaseError } from "./throwDatabaseError.ts";

/**
 * Selects the default space of the user of `db`, or removes it with `null`
 * (PLAN.md, D17). The settings page and the MCP tool `set_default_space` use
 * it.
 */
export const setDefaultSpace = async ({
  db,
  spaceId,
}: {
  db: PostgrestDbClient;
  spaceId: string | null;
}): Promise<void> => {
  const { data, error } = await db.rpc("set_default_space", {
    p_space_id: spaceId,
  });
  if (error || !data) {
    throwDatabaseError({
      operation: "setDefaultSpace",
      error,
      messages: { fallback: "The default space cannot be saved." },
    });
  }
};
