import { aliasFormSchema } from "./aliasFormSchema.ts";
import { describe, expect, it } from "vitest";

const barack = "a0000000-0000-4000-8000-000000000001";
const michelle = "a0000000-0000-4000-8000-000000000002";

describe("aliasFormSchema", () => {
  it("gives the parameters of save_alias", () => {
    expect(
      aliasFormSchema.parse({
        name: " Obamas' Shared Account ",
        member_ids: [barack, michelle],
      }),
    ).toEqual({
      name: "Obamas' Shared Account",
      member_ids: [barack, michelle],
    });
  });

  it("refuses an empty name, no members, and a member two times", () => {
    expect(
      aliasFormSchema
        .safeParse({ name: " ", member_ids: [] })
        .error?.issues.map((issue) => issue.message),
    ).toEqual(["Enter a name.", "Select one or more members."]);
    expect(
      aliasFormSchema
        .safeParse({ name: "Obamas", member_ids: [barack, barack] })
        .error?.issues.map((issue) => issue.message),
    ).toEqual(["Select each member one time only."]);
  });
});
