import { resolveRoleOnUserCreate } from "./resolveRoleOnUserCreate.ts";
import { describe, expect, it } from "vitest";

describe("resolveRoleOnUserCreate", () => {
  it("gives admin for the Pocket ID callback", () => {
    expect(
      resolveRoleOnUserCreate({
        endpointPath: "/callback/pocket-id",
        providerId: "pocket-id",
      }),
    ).toBe("admin");
    expect(
      resolveRoleOnUserCreate({
        endpointPath: "/callback/:id",
        providerId: "pocket-id",
      }),
    ).toBe("admin");
  });

  it("gives guest for a different provider", () => {
    expect(
      resolveRoleOnUserCreate({
        endpointPath: "/callback/github",
        providerId: "github",
      }),
    ).toBe("guest");
  });

  it("gives guest for a different endpoint", () => {
    for (const endpointPath of [
      "/sign-in/email-otp",
      "/sign-in/social",
      "/callback/pocket-id/extra",
    ]) {
      expect(
        resolveRoleOnUserCreate({ endpointPath, providerId: "pocket-id" }),
        endpointPath,
      ).toBe("guest");
    }
  });

  it("gives guest with no endpoint, for example an invitation", () => {
    expect(
      resolveRoleOnUserCreate({
        endpointPath: undefined,
        providerId: undefined,
      }),
    ).toBe("guest");
  });
});
