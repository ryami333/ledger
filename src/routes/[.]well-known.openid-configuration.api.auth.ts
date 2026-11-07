import { auth } from "../server/auth.ts";
import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { createFileRoute } from "@tanstack/react-router";

const serveMetadata = oauthProviderOpenIdConfigMetadata(auth);

/**
 * The OpenID Connect discovery document of the authorization server for the
 * MCP clients (PLAN.md, D15), at the path that an MCP client tries after
 * `/.well-known/oauth-authorization-server/api/auth`.
 */
export const Route = createFileRoute(
  "/.well-known/openid-configuration/api/auth",
)({
  server: {
    handlers: {
      GET: ({ request }) => serveMetadata(request),
    },
  },
});
