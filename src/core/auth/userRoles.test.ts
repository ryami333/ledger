import { isUserRole, readUserRole } from "./userRoles.ts";
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

describe("readUserRole", () => {
  it("reads a valid role", () => {
    expect(readUserRole({ id: "a", role: "admin" })).toBe("admin");
  });

  it("gives guest for a missing or unknown role", () => {
    expect(readUserRole({ id: "a" })).toBe("guest");
    expect(readUserRole({ id: "a", role: "owner" })).toBe("guest");
  });
});
