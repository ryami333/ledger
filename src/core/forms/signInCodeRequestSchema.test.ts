import { signInCodeRequestSchema } from "./signInCodeRequestSchema.ts";
import { describe, expect, it } from "vitest";

describe("signInCodeRequestSchema", () => {
  it("makes the email lowercase and keeps oauthQuery", () => {
    expect(
      signInCodeRequestSchema.parse({
        email: " Barack@Example.com",
        oauthQuery: "client_id=a&sig=b",
      }),
    ).toEqual({ email: "barack@example.com", oauthQuery: "client_id=a&sig=b" });
  });

  it("refuses an invalid email", () => {
    expect(
      signInCodeRequestSchema.safeParse({ email: "barack@" }).success,
    ).toBe(false);
  });
});
