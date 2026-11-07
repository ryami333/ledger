import { auth } from "../server/auth.ts";
import { createFileRoute } from "@tanstack/react-router";

/**
 * The protected resource metadata (RFC 9728) of the MCP server (PLAN.md,
 * D15). The plugin mcp() of better-auth writes the document. Its path is
 * outside `/api/auth`, thus this route gives the request to better-auth.
 */
export const Route = createFileRoute(
  "/.well-known/oauth-protected-resource/mcp",
)({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
    },
  },
});
