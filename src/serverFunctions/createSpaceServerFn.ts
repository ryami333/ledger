import { spaceFormSchema } from "../core/forms/spaceFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";

/**
 * Makes a space with its default currency and its first members, in one
 * database transaction (PLAN.md, D9). Returns the ID of the space.
 */
export const createSpaceServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(spaceFormSchema)
  .handler(async ({ data, context }) => {
    const { data: spaceId, error } = await context.db.rpc("create_space", {
      p_title: data.title,
      p_description: data.description,
      p_default_currency: data.default_currency,
      p_member_names: data.member_names,
    });
    if (error || !spaceId) {
      return throwDatabaseError({
        operation: "createSpaceServerFn",
        error,
        messages: {
          uniqueViolation: "Each member needs a different name.",
          fallback: "The space cannot be made.",
        },
      });
    }
    return { spaceId };
  });
