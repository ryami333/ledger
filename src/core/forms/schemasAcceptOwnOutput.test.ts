import { aliasFormSchema } from "./aliasFormSchema.ts";
import { currencyFormSchema } from "./currencyFormSchema.ts";
import { spaceDetailsFormSchema } from "./spaceDetailsFormSchema.ts";
import { spaceFormSchema } from "./spaceFormSchema.ts";
import { describe, expect, it } from "vitest";

// A server function validates the output of a form with the same schema.
describe("the form schemas of Phase 4", () => {
  it("accept their own output and give it again", () => {
    const cases = [
      {
        schema: spaceFormSchema,
        input: {
          title: " Trip ",
          description: " ",
          slug: "Trip",
          default_currency: "EUR",
          member_names: [" Barack ", ""],
        },
      },
      {
        schema: spaceDetailsFormSchema,
        input: { title: " Trip ", description: "", slug: " Road-Trip " },
      },
      {
        schema: aliasFormSchema,
        input: {
          name: " Obamas ",
          member_ids: ["a0000000-0000-4000-8000-000000000001"],
        },
      },
      {
        schema: currencyFormSchema,
        input: {
          currencies: [
            { currency: "EUR", rate: "1.000", is_default: true },
            { currency: "USD", rate: "0.920", is_default: false },
          ],
        },
      },
    ];
    for (const { schema, input } of cases) {
      const output = schema.parse(input);
      expect(schema.parse(output)).toEqual(output);
    }
  });
});
