import { isClaudeClientMetadataUrl } from "./isClaudeClientMetadataUrl.ts";
import { describe, expect, it } from "vitest";

describe("isClaudeClientMetadataUrl", () => {
  it("accepts a document on claude.ai or claude.com", () => {
    expect(
      isClaudeClientMetadataUrl(
        "https://claude.ai/oauth/claude-code-client-metadata",
      ),
    ).toBe(true);
    expect(isClaudeClientMetadataUrl("https://claude.com/oauth/client")).toBe(
      true,
    );
  });

  it("refuses a different host, a subdomain, or http", () => {
    expect(isClaudeClientMetadataUrl("https://example.com/client")).toBe(false);
    expect(isClaudeClientMetadataUrl("https://evil.claude.ai/client")).toBe(
      false,
    );
    expect(isClaudeClientMetadataUrl("http://claude.ai/client")).toBe(false);
    expect(isClaudeClientMetadataUrl("https://claude.ai.evil.com/x")).toBe(
      false,
    );
  });

  it("refuses credentials and a text that is not a URL", () => {
    expect(isClaudeClientMetadataUrl("https://user@claude.ai/client")).toBe(
      false,
    );
    expect(isClaudeClientMetadataUrl("claude.ai/client")).toBe(false);
  });
});
