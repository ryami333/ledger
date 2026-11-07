import { env } from "../env.ts";
import { auth, mcpResourceUrl } from "../server/auth.ts";
import { createUserPostgrestClient } from "../server/createUserPostgrestClient.ts";
import { createLedgerMcpServer } from "../server/mcp/createLedgerMcpServer.ts";
import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Verifies the access token (signature, issuer, audience, expiry), then
 * serves the MCP request. A request with no valid token gets a 401 with a
 * pointer to the protected resource metadata. The MCP client then starts
 * the OAuth flow.
 */
const handleMcpRequest = requireMcpAuth(
  auth,
  async (request, claims) => {
    const userId = claims.sub;
    if (!userId) {
      return new Response(null, { status: 401 });
    }
    const scopes =
      typeof claims.scope === "string" ? claims.scope.split(" ") : [];
    const clientId = typeof claims.azp === "string" ? claims.azp : "unknown";
    // Stateless: one MCP server for each request, for the protocol of
    // 2026-07-28 and for the protocol of 2025.
    const mcpHandler = createMcpHandler(() =>
      createLedgerMcpServer({
        db: createUserPostgrestClient({ userId }),
        userId,
        scopes,
        clientId,
        appUrl: env.APP_URL,
        locale: env.APP_LOCALE,
        timeZone: env.APP_TIME_ZONE,
      }),
    );
    return mcpHandler.fetch(request);
  },
  { resource: mcpResourceUrl },
);

const methodNotAllowed = () =>
  new Response("Method not allowed.", {
    status: 405,
    headers: { allow: "POST" },
  });

/**
 * The MCP server of ledger (PLAN.md, D15): Streamable HTTP, `POST` only, with
 * no protocol sessions.
 */
export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handleMcpRequest(request),
      GET: methodNotAllowed,
      DELETE: methodNotAllowed,
    },
  },
});
