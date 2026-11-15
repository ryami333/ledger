import { isUserRole } from "./userRoles.ts";
import { describe, expect, it } from "vitest";

describe("isUserRole", () => {
  it("accepts admin and guest", () => {
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("guest")).toBe(true);
  });

  it("refuses each other value", () => {
    for (const input of ["Admin", "owner", "", null, undefined, 1]) {
      expect(isUserRole(input), String(input)).toBe(false);
    }
  });
});
