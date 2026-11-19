import { readUserRole } from "../core/auth/userRoles.ts";
import { guestSpacesSchema } from "../core/forms/guestSpacesSchema.ts";
import { adminMiddleware } from "../server/adminMiddleware.ts";
import { auth } from "../server/auth.ts";
import { setSpaceGuests } from "../server/setSpaceGuests.ts";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Replaces the spaces of a guest, from "Edit Spaces" on `/users` (PLAN.md,
 * D20). Only an admin can call it. It refuses an admin, because an admin
 * reads and changes all spaces.
 */
export const setGuestSpacesServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(guestSpacesSchema.extend({ userId: z.guid() }))
  .handler(async ({ data, context }) => {
    const { internalAdapter } = await auth.$context;
    const user = await internalAdapter.findUserById(data.userId);
    if (!user) {
      setResponseStatus(404);
      throw new Error("The user does not exist.");
    }
    if (readUserRole(user) !== "guest") {
      setResponseStatus(403);
      throw new Error("An admin has all spaces.");
    }
    await setSpaceGuests({
      db: context.db,
      userId: user.id,
      spaceIds: data.space_ids,
    });
    console.log("setGuestSpacesServerFn saved", {
      userId: user.id,
      changedBy: context.userId,
      spaceCount: data.space_ids.length,
    });
  });
