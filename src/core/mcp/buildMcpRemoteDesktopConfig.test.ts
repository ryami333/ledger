import { buildMcpRemoteDesktopConfig } from "./buildMcpRemoteDesktopConfig.ts";
import { describe, expect, it } from "vitest";

describe("buildMcpRemoteDesktopConfig", () => {
  it("starts mcp-remote with the URL and the static client ID", () => {
    const config: unknown = JSON.parse(
      buildMcpRemoteDesktopConfig({
        mcpUrl: "https://ledger.example.org/mcp",
        clientId: "abc123",
      }),
    );
    expect(config).toEqual({
      mcpServers: {
        ledger: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            "https://ledger.example.org/mcp",
            "--static-oauth-client-info",
            '{"client_id":"abc123"}',
          ],
        },
      },
    });
  });

  it("escapes a client ID with a quote, so the JSON stays valid", () => {
    const text = buildMcpRemoteDesktopConfig({
      mcpUrl: "https://ledger.example.org/mcp",
      clientId: 'a"b',
    });
    expect(() => {
      JSON.parse(text);
    }).not.toThrow();
  });
});
