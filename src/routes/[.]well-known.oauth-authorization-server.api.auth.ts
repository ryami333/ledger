import { auth } from "../server/auth.ts";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { createFileRoute } from "@tanstack/react-router";

const serveMetadata = oauthProviderAuthServerMetadata(auth);

/**
 * The OAuth authorization server metadata (RFC 8414) for the MCP clients
 * (PLAN.md, D15). The issuer is `<APP_URL>/api/auth`, thus the path of the
 * document is `/.well-known/oauth-authorization-server/api/auth`.
 */
export const Route = createFileRoute(
  "/.well-known/oauth-authorization-server/api/auth",
)({
  server: {
    handlers: {
      GET: ({ request }) => serveMetadata(request),
    },
  },
});
