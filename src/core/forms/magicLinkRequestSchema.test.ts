import { magicLinkRequestSchema } from "./magicLinkRequestSchema.ts";
import { describe, expect, it } from "vitest";

describe("magicLinkRequestSchema", () => {
  it("makes the email lowercase and keeps next and oauthQuery", () => {
    expect(
      magicLinkRequestSchema.parse({
        email: " Mitch@Example.com",
        next: "/spaces/rome",
        oauthQuery: "client_id=a&sig=b",
      }),
    ).toEqual({
      email: "mitch@example.com",
      next: "/spaces/rome",
      oauthQuery: "client_id=a&sig=b",
    });
  });

  it("refuses an invalid email", () => {
    expect(magicLinkRequestSchema.safeParse({ email: "mitch@" }).success).toBe(
      false,
    );
  });
});
