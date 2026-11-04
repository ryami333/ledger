import { memberFormSchema } from "./memberFormSchema.ts";
import { describe, expect, it } from "vitest";

describe("memberFormSchema", () => {
  it("removes the spaces at the two ends and refuses an empty name", () => {
    expect(memberFormSchema.parse({ name: " Barack " })).toEqual({
      name: "Barack",
    });
    expect(memberFormSchema.safeParse({ name: " " }).success).toBe(false);
  });
});
