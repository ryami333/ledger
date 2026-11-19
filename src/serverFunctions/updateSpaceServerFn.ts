import { spaceDetailsFormSchema } from "../core/forms/spaceDetailsFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Changes the title, the description, and the slug of a space. Only an admin
 * can do this (PLAN.md, D20). RLS refuses a guest. The check here only gives
 * the guest a clear text.
 */
export const updateSpaceServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(spaceDetailsFormSchema.extend({ spaceId: z.guid() }))
  .handler(async ({ data, context }) => {
    if (context.user.role !== "admin") {
      setResponseStatus(403);
      throw new Error("Only an admin can change the details of a space.");
    }
    const { data: rows, error } = await context.db
      .from("spaces")
      .update({
        title: data.title,
        description: data.description,
        slug: data.slug,
      })
      .eq("id", data.spaceId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "updateSpaceServerFn",
        error,
        messages: {
          uniqueViolation: "A different space uses this slug.",
          fallback: "The space cannot be saved.",
        },
      });
    }
  });
