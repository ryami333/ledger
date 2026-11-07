import { describeOAuthRedirect } from "./describeOAuthRedirect.ts";
import { describe, expect, it } from "vitest";

describe("describeOAuthRedirect", () => {
  it("gives the host of a hosted Claude app", () => {
    expect(
      describeOAuthRedirect("https://claude.ai/api/mcp/auth_callback"),
    ).toEqual({ host: "claude.ai", isLoopback: false });
  });

  it("marks a loopback redirect of Claude Code", () => {
    expect(describeOAuthRedirect("http://localhost:3118/callback")).toEqual({
      host: "localhost:3118",
      isLoopback: true,
    });
    expect(describeOAuthRedirect("http://127.0.0.1:50000/callback")).toEqual({
      host: "127.0.0.1:50000",
      isLoopback: true,
    });
    expect(describeOAuthRedirect("http://[::1]:50000/callback")).toEqual({
      host: "[::1]:50000",
      isLoopback: true,
    });
  });

  it("gives null for a text that is not a URL", () => {
    expect(describeOAuthRedirect("not a url")).toBeNull();
  });
});
