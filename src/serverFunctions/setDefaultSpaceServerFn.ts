import { authMiddleware } from "../server/authMiddleware.ts";
import { setDefaultSpace } from "../server/setDefaultSpace.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Selects the default space of the signed-in user, or removes it with
 * `null` (PLAN.md, D17).
 */
export const setDefaultSpaceServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ spaceId: z.guid().nullable() }))
  .handler(({ data, context }) =>
    setDefaultSpace({ db: context.db, spaceId: data.spaceId }),
  );
