/**
 * Builds the text for `claude_desktop_config.json` that starts mcp-remote
 * for ledger (PLAN.md, D15). mcp-remote uses the client ID of a client that
 * the user made on the page `/account`. It then does not try Dynamic Client
 * Registration.
 */
export const buildMcpRemoteDesktopConfig = ({
  mcpUrl,
  clientId,
}: {
  mcpUrl: string;
  clientId: string;
}): string =>
  JSON.stringify(
    {
      mcpServers: {
        ledger: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote",
            mcpUrl,
            "--static-oauth-client-info",
            JSON.stringify({ client_id: clientId }),
          ],
        },
      },
    },
    null,
    2,
  );
