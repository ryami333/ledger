import { oauthQueryToAuthorizePath } from "./oauthQueryToAuthorizePath.ts";
import { describe, expect, it } from "vitest";

describe("oauthQueryToAuthorizePath", () => {
  it("removes the signature parameters and keeps the rest in order", () => {
    expect(
      oauthQueryToAuthorizePath(
        "response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Fa&state=x&exp=1&ba_iat=2&ba_param=client_id&ba_param=state&sig=abc",
      ),
    ).toBe(
      "/api/auth/oauth2/authorize?response_type=code&client_id=https%3A%2F%2Fclaude.ai%2Fa&state=x",
    );
  });

  it("removes the prompt login and max_age", () => {
    expect(
      oauthQueryToAuthorizePath(
        "client_id=a&prompt=login+consent&max_age=0&sig=abc",
      ),
    ).toBe("/api/auth/oauth2/authorize?client_id=a&prompt=consent");
    expect(oauthQueryToAuthorizePath("client_id=a&prompt=login")).toBe(
      "/api/auth/oauth2/authorize?client_id=a",
    );
  });
});
