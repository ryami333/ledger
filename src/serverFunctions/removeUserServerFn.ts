import { readUserRole } from "../core/auth/userRoles.ts";
import { adminMiddleware } from "../server/adminMiddleware.ts";
import { auth } from "../server/auth.ts";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Removes a guest (PLAN.md, D19, rule 5). The delete also deletes the
 * sessions, the OAuth tokens, the linked members, and the default space of
 * the guest. The transactions stay, with no `created_by`.
 *
 * It refuses an admin and the current user. `yarn user:remove` can remove
 * an admin.
 */
export const removeUserServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ userId: z.uuid() }))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) {
      setResponseStatus(400);
      throw new Error("You cannot remove yourself.");
    }
    const { internalAdapter } = await auth.$context;
    const user = await internalAdapter.findUserById(data.userId);
    if (!user) {
      setResponseStatus(404);
      throw new Error("The user does not exist.");
    }
    if (readUserRole(user) !== "guest") {
      setResponseStatus(403);
      throw new Error("Only a guest can be removed here.");
    }
    await internalAdapter.deleteUser(user.id);
    console.log("removeUserServerFn removed", {
      userId: user.id,
      removedBy: context.userId,
    });
  });
