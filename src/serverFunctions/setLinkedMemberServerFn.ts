import { authMiddleware } from "../server/authMiddleware.ts";
import { setLinkedMember } from "../server/setLinkedMember.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Selects the member that the signed-in user is in a space, or removes it
 * with `null` (PLAN.md, D16).
 */
export const setLinkedMemberServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceId: z.guid(), memberId: z.guid().nullable() }))
  .handler(({ data, context }) =>
    setLinkedMember({
      db: context.db,
      spaceId: data.spaceId,
      memberId: data.memberId,
    }),
  );
