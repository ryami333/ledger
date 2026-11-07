import { snakeCaseModel, toSnakeCase } from "./snakeCaseModel.ts";
import { describe, expect, it } from "vitest";

describe("toSnakeCase", () => {
  it("writes each word in small letters, with an underscore between", () => {
    expect(toSnakeCase("clientId")).toBe("client_id");
    expect(toSnakeCase("requirePKCE")).toBe("require_pkce");
    expect(toSnakeCase("backchannelLogoutSessionRequired")).toBe(
      "backchannel_logout_session_required",
    );
  });

  it("keeps a name with no capital letter", () => {
    expect(toSnakeCase("scopes")).toBe("scopes");
  });
});

describe("snakeCaseModel", () => {
  it("maps each field to its column", () => {
    expect(
      snakeCaseModel({
        modelName: "oauth_consents",
        fields: ["clientId", "userId", "scopes"],
      }),
    ).toEqual({
      modelName: "oauth_consents",
      fields: { clientId: "client_id", userId: "user_id", scopes: "scopes" },
    });
  });
});
