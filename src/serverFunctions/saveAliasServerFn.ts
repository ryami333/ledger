import { aliasFormSchema } from "../core/forms/aliasFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Adds an alias, or changes an alias and replaces its members, in one
 * database transaction (PLAN.md, D9). Give `null` as `aliasId` for a new
 * alias. Returns the ID of the alias.
 */
export const saveAliasServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    aliasFormSchema.extend({
      spaceId: z.guid(),
      aliasId: z.guid().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: aliasId, error } = await context.db.rpc("save_alias", {
      p_alias_id: data.aliasId,
      p_space_id: data.spaceId,
      p_name: data.name,
      p_member_ids: data.member_ids,
    });
    if (error || !aliasId) {
      return throwDatabaseError({
        operation: "saveAliasServerFn",
        error,
        messages: {
          uniqueViolation: "Another alias of the space has this name.",
          fallback: "The alias cannot be saved.",
        },
      });
    }
    return { aliasId };
  });
