import { oauthQueryToAuthorizePath } from "../core/auth/oauthQueryToAuthorizePath.ts";
import { resolveRedirectPath } from "../core/auth/resolveRedirectPath.ts";
import { magicLinkRequestSchema } from "../core/forms/magicLinkRequestSchema.ts";
import { env } from "../env.ts";
import { auth } from "../server/auth.ts";
import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseStatus,
} from "@tanstack/react-start/server";

/**
 * Asks better-auth to send a magic link (PLAN.md, D18). The answer is the
 * same for a known and an unknown email, so a caller cannot find which
 * emails have a user.
 *
 * The request goes through `auth.handler`, not `auth.api`. Only the handler
 * applies the rate limit and the CSRF check of better-auth.
 *
 * With a signed query of the OAuth server (`oauthQuery`), the magic link
 * opens the authorize endpoint after the sign-in (D18, rule 6).
 */
export const requestMagicLinkServerFn = createServerFn({ method: "POST" })
  .validator(magicLinkRequestSchema)
  .handler(async ({ data }) => {
    const callbackPath = await (async () => {
      if (data.oauthQuery === undefined) {
        return resolveRedirectPath({ next: data.next, fallback: "/" });
      }
      const { secret } = await auth.$context;
      if (!(await verifyOAuthQueryParams(data.oauthQuery, secret))) {
        setResponseStatus(400);
        throw new Error(
          "The sign-in request of the app expired. Start it again in the app.",
        );
      }
      return oauthQueryToAuthorizePath(data.oauthQuery);
    })();

    const headers = new Headers(getRequestHeaders());
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    const response = await auth.handler(
      new Request(new URL("/api/auth/sign-in/magic-link", env.APP_URL), {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: data.email,
          callbackURL: callbackPath,
          // The verify endpoint adds the parameter error.
          errorCallbackURL: "/login",
        }),
      }),
    );
    if (response.status === 429) {
      setResponseStatus(429);
      throw new Error("Too many requests. Wait 10 minutes, then try again.");
    }
    if (!response.ok) {
      console.error("requestMagicLinkServerFn failed", {
        status: response.status,
      });
      setResponseStatus(502);
      throw new Error("The sign-in link cannot be sent. Try again.");
    }
    return { sent: true };
  });
