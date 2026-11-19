import { signInCodeSchema } from "./signInCodeSchema.ts";
import { describe, expect, it } from "vitest";

describe("signInCodeSchema", () => {
  it("removes spaces and hyphens from the code", () => {
    for (const code of ["123456", " 123 456 ", "123-456"]) {
      expect(
        signInCodeSchema.parse({ email: "barack@example.com", code }).code,
        code,
      ).toBe("123456");
    }
  });

  it("keeps next and oauthQuery", () => {
    expect(
      signInCodeSchema.parse({
        email: "Barack@Example.com",
        code: "123456",
        next: "/spaces/rome",
        oauthQuery: "client_id=a&sig=b",
      }),
    ).toEqual({
      email: "barack@example.com",
      code: "123456",
      next: "/spaces/rome",
      oauthQuery: "client_id=a&sig=b",
    });
  });

  it("refuses a code that is not 6 digits", () => {
    for (const code of ["", "12345", "1234567", "12345a"]) {
      expect(
        signInCodeSchema.safeParse({ email: "barack@example.com", code })
          .success,
        code,
      ).toBe(false);
    }
  });
});
