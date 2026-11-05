import { spaceFormSchema } from "../core/forms/spaceFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";

/**
 * Makes a space with its default currency and its first members, in one
 * database transaction (PLAN.md, D9). Returns the slug of the space, for
 * the route of the space page.
 *
 * It reads the slug first, so that the user gets a clear text when a
 * different space uses it. The unique constraint still refuses a slug that a
 * request adds at the same time.
 */
export const createSpaceServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(spaceFormSchema)
  .handler(async ({ data, context }) => {
    const { data: spacesWithSlug, error: slugError } = await context.db
      .from("spaces")
      .select("id")
      .eq("slug", data.slug)
      .limit(1);
    if (slugError) {
      return throwDatabaseError({
        operation: "createSpaceServerFn",
        error: slugError,
        messages: { fallback: "The space cannot be made." },
      });
    }
    if (spacesWithSlug.length > 0) {
      throw new Error("A different space uses this slug.");
    }

    const { data: spaceId, error } = await context.db.rpc("create_space", {
      p_title: data.title,
      p_description: data.description,
      p_default_currency: data.default_currency,
      p_member_names: data.member_names,
      p_slug: data.slug,
    });
    if (error || !spaceId) {
      return throwDatabaseError({
        operation: "createSpaceServerFn",
        error,
        messages: {
          uniqueViolation:
            "A different space uses this slug, or two members have the same name.",
          fallback: "The space cannot be made.",
        },
      });
    }
    return { spaceSlug: data.slug };
  });
