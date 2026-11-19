/**
 * The OAuth client metadata of an mcp-remote client (PLAN.md, D15). A user
 * makes this client on the page `/account`, then gives its client ID to
 * mcp-remote with `--static-oauth-client-info`.
 *
 * The client is public: it has no secret, and it uses PKCE. mcp-remote
 * listens on a loopback port that changes. The authorization server ignores
 * the port of a loopback redirect URI (RFC 8252, section 7.3). Thus the
 * redirect URIs have no port, and each port matches.
 */
export const mcpRemoteClientMetadata = {
  client_name: "mcp-remote",
  application_type: "native",
  token_endpoint_auth_method: "none",
  grant_types: ["authorization_code", "refresh_token"],
  response_types: ["code"],
  redirect_uris: [
    "http://localhost/oauth/callback",
    "http://127.0.0.1/oauth/callback",
  ],
} as const;
