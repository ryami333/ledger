import { buildMagicLinkConfirmUrl } from "./buildMagicLinkConfirmUrl.ts";
import { describe, expect, it } from "vitest";

describe("buildMagicLinkConfirmUrl", () => {
  it("gives the confirm page with the token", () => {
    expect(
      buildMagicLinkConfirmUrl({
        appUrl: "https://ledger.example",
        token: "abc",
        callbackPath: "/",
      }).href,
    ).toBe("https://ledger.example/auth/magic-link?token=abc");
  });

  it("adds next for a different path, encoded", () => {
    const url = buildMagicLinkConfirmUrl({
      appUrl: "http://127.0.0.1:3001",
      token: "abc",
      callbackPath: "/api/auth/oauth2/authorize?client_id=a&state=b",
    });
    expect(url.searchParams.get("next")).toBe(
      "/api/auth/oauth2/authorize?client_id=a&state=b",
    );
    expect(url.pathname).toBe("/auth/magic-link");
  });
});
