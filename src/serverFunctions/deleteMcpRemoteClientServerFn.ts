import { auth } from "../server/auth.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Deletes an OAuth client of the signed-in user (PLAN.md, D15). better-auth
 * refuses a client of a different user. The delete also deletes the refresh
 * tokens and the consents of the client. An access token is a JWT, thus it
 * stays valid until it expires.
 */
export const deleteMcpRemoteClientServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .validator(z.object({ clientId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    await auth.api.deleteOAuthClient({
      body: { client_id: data.clientId },
      headers: getRequestHeaders(),
    });
    console.log("deleteMcpRemoteClientServerFn deleted", {
      clientId: data.clientId,
      userId: context.userId,
    });
  });
