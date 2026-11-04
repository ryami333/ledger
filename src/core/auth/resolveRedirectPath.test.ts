import { resolveRedirectPath } from "./resolveRedirectPath.ts";
import { describe, expect, it } from "vitest";

describe("resolveRedirectPath", () => {
  const fallback = "/";

  it("accepts a path on the same origin", () => {
    expect(resolveRedirectPath({ next: "/search?term=a", fallback })).toBe(
      "/search?term=a",
    );
  });

  it("refuses an empty value, an absolute URL, and tricks", () => {
    for (const next of [
      null,
      undefined,
      "",
      "search",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/\tevil",
    ]) {
      expect(resolveRedirectPath({ next, fallback }), String(next)).toBe(
        fallback,
      );
    }
  });
});
