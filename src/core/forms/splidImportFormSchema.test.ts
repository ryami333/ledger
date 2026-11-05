import { splidImportFormSchema } from "./splidImportFormSchema.ts";
import { describe, expect, it } from "vitest";

const MITCH = "20000000-0000-4000-8000-000000000001";
const SHAN = "20000000-0000-4000-8000-000000000002";

describe("splidImportFormSchema", () => {
  it("accepts a different member for each name", () => {
    expect(
      splidImportFormSchema.safeParse({ memberIds: [MITCH, SHAN] }).success,
    ).toBe(true);
  });

  it("refuses a name with no member and a member two times", () => {
    expect(
      splidImportFormSchema.safeParse({ memberIds: [MITCH, ""] }).success,
    ).toBe(false);
    expect(
      splidImportFormSchema.safeParse({ memberIds: [MITCH, MITCH] }).success,
    ).toBe(false);
  });
});
