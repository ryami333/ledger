import { guestSpacesSchema } from "./guestSpacesSchema.ts";
import { describe, expect, it } from "vitest";

const SPACE_A = "b0000000-0000-4000-8000-000000000001";
const SPACE_B = "b0000000-0000-4000-8000-000000000002";

describe("guestSpacesSchema", () => {
  it("accepts an empty list", () => {
    expect(guestSpacesSchema.parse({ space_ids: [] })).toEqual({
      space_ids: [],
    });
  });

  it("removes a repeated space and keeps the order", () => {
    expect(
      guestSpacesSchema.parse({ space_ids: [SPACE_B, SPACE_A, SPACE_B] }),
    ).toEqual({ space_ids: [SPACE_B, SPACE_A] });
  });

  it("refuses an ID that is not a UUID", () => {
    expect(
      guestSpacesSchema.safeParse({ space_ids: ["washington"] }).success,
    ).toBe(false);
  });
});
