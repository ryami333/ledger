import { inviteUserSchema } from "./inviteUserSchema.ts";
import { describe, expect, it } from "vitest";

describe("inviteUserSchema", () => {
  it("trims the name and makes the email lowercase", () => {
    expect(
      inviteUserSchema.parse({
        name: " Kamala ",
        email: " Kamala@Example.com ",
      }),
    ).toEqual({ name: "Kamala", email: "kamala@example.com" });
  });

  it("refuses an empty name, a long name, and an invalid email", () => {
    expect(
      inviteUserSchema.safeParse({ name: " ", email: "a@example.com" }).success,
    ).toBe(false);
    expect(
      inviteUserSchema.safeParse({
        name: "a".repeat(101),
        email: "a@example.com",
      }).success,
    ).toBe(false);
    expect(
      inviteUserSchema.safeParse({ name: "Kamala", email: "kamala" }).success,
    ).toBe(false);
  });

  it("accepts its own output", () => {
    const output = inviteUserSchema.parse({
      name: " Kamala ",
      email: "KAMALA@example.com",
    });
    expect(inviteUserSchema.parse(output)).toEqual(output);
  });
});
