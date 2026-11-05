import { spaceFormSchema } from "../core/forms/spaceFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";

/**
 * Makes a space with its default currency and its first members, in one
 * database transaction (PLAN.md, D9). Returns the slug of the space, for
 * the route of the space page.
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
    const { data: space, error: readError } = await context.db
      .from("spaces")
      .select("slug")
      .eq("id", spaceId)
      .maybeSingle();
    if (readError || !space) {
      return throwDatabaseError({
        operation: "createSpaceServerFn",
        error: readError,
        messages: { fallback: "The space cannot be read." },
      });
    }
    return { spaceSlug: space.slug };
  });
