import { spaceFormSchema } from "../core/forms/spaceFormSchema.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Changes the title and the description of a space. */
export const updateSpaceServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    spaceFormSchema
      .pick({ title: true, description: true })
      .extend({ spaceId: z.guid() }),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.db
      .from("spaces")
      .update({ title: data.title, description: data.description })
      .eq("id", data.spaceId)
      .select("id");
    if (error || rows.length === 0) {
      throwDatabaseError({
        operation: "updateSpaceServerFn",
        error,
        messages: { fallback: "The space cannot be saved." },
      });
    }
  });
