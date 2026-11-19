import { mcpRemoteClientMetadata } from "../core/mcp/mcpRemoteClientMetadata.ts";
import { auth } from "../server/auth.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

/**
 * Makes a public OAuth client for mcp-remote, with the signed-in user as its
 * owner (PLAN.md, D15). It returns the client ID.
 *
 * The client tables are in better_auth, not in PostgREST. Thus better-auth
 * does the write, with the session of the request. It sets the owner.
 */
export const createMcpRemoteClientServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const client = await auth.api.createOAuthClient({
      body: {
        ...mcpRemoteClientMetadata,
        grant_types: [...mcpRemoteClientMetadata.grant_types],
        response_types: [...mcpRemoteClientMetadata.response_types],
        redirect_uris: [...mcpRemoteClientMetadata.redirect_uris],
      },
      headers: getRequestHeaders(),
    });
    console.log("createMcpRemoteClientServerFn created", {
      clientId: client.client_id,
      userId: context.userId,
    });
    return { clientId: client.client_id };
  });
