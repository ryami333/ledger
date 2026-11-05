import { spaceFormSchema } from "./spaceFormSchema.ts";

/** The "Details" form on the settings page of a space. */
export const spaceDetailsFormSchema = spaceFormSchema.pick({
  title: true,
  description: true,
  slug: true,
});
