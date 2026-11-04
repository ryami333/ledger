import { memberFormSchema } from "../core/forms/memberFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messages = {
  uniqueViolation: "Another member of the space has this name.",
  fallback: "The member cannot be saved.",
};

/**
 * Adds a member to a space, or renames a member. Give `null` as `memberId`
 * for a new member. Returns the ID of the member.
 */
export const saveMemberServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    memberFormSchema.extend({
      spaceId: z.guid(),
      memberId: z.guid().nullable(),
    }),
  )
  .handler(async ({ data, context }) => {
    const query =
      data.memberId === null
        ? context.db
            .from("members")
            .insert({ space_id: data.spaceId, name: data.name })
        : context.db
            .from("members")
            .update({ name: data.name })
            .eq("id", data.memberId)
            .eq("space_id", data.spaceId);
    const { data: rows, error } = await query.select("id");
    const memberId = rows?.[0]?.id;
    if (error || memberId === undefined) {
      return throwDatabaseError({
        operation: "saveMemberServerFn",
        error,
        messages,
      });
    }
    return { memberId };
  });
