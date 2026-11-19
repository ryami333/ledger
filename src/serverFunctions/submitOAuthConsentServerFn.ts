import { auth } from "../server/auth.ts";
import { authMiddleware } from "../server/authMiddleware.ts";
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Accepts or denies the consent of the signed-in user for an OAuth client
 * (PLAN.md, D15). `oauthQuery` is the signed query of the consent page, as
 * the browser got it. Returns the URL to open next: the redirect URI of the
 * client, with a code or with the error `access_denied`.
 */
export const submitOAuthConsentServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ accept: z.boolean(), oauthQuery: z.string().min(1) }))
  .handler(async ({ data }) => {
    const result = await auth.api.oauth2Consent({
      body: { accept: data.accept, oauth_query: data.oauthQuery },
      headers: getRequestHeaders(),
      // An accepted consent continues the authorization, and the authorize
      // step refuses a call with no request ("request not found"). With a
      // request, better-auth gives a Response, thus asResponse is false.
      request: getRequest(),
      asResponse: false,
    });
    return { url: result.url };
  });
