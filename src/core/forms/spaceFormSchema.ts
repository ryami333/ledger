import {
  currencyCodeSchema,
  optionalTextSchema,
  requiredTextSchema,
} from "./formFieldSchemas.ts";
import { z } from "zod";

/**
 * The member names of the "New space" modal. It removes the empty names. Two
 * names must not be the same, with no difference between capital letters and
 * small letters (PLAN.md, D8).
 */
const memberNamesSchema = z
  .array(z.string())
  .superRefine((names, context) => {
    const seenNames = new Set<string>();
    names.forEach((name, nameIndex) => {
      const key = name.trim().toLowerCase();
      if (key === "") {
        return;
      }
      if (seenNames.has(key)) {
        context.addIssue({
          code: "custom",
          path: [nameIndex],
          message: "Each member needs a different name.",
        });
      }
      seenNames.add(key);
    });
  })
  .transform((names) =>
    names.map((name) => name.trim()).filter((name) => name !== ""),
  );

/**
 * The "New space" modal (PLAN.md, UI). The output has the parameters of
 * `create_space` (D9). The form to edit a space uses only `title` and
 * `description`: use `spaceFormSchema.pick(...)`.
 */
export const spaceFormSchema = z.object({
  title: requiredTextSchema("Enter a title."),
  description: optionalTextSchema,
  default_currency: currencyCodeSchema,
  member_names: memberNamesSchema,
});
