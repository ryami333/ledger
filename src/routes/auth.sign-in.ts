import { env } from "../env.ts";
import { pocketIdProviderId } from "../core/auth/pocketIdProviderId.ts";
import { auth } from "../server/auth.ts";
import { isEmailEnabled } from "../server/sendEmail.ts";
import { resolveRedirectPath } from "../core/auth/resolveRedirectPath.ts";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Starts the sign-in with Pocket ID. better-auth makes the state and the PKCE
 * code verifier, and stores them in a cookie. Then the browser goes to Pocket
 * ID. Pocket ID sends the browser back to `/api/auth/callback/pocket-id`, and
 * better-auth then opens `next`.
 *
 * This route is also the login page of the OAuth server for the MCP clients
 * (PLAN.md, D15). The authorize endpoint then sends a signed query with `sig`.
 * The route gives this query to better-auth as `oauth_query`. After the
 * Pocket ID callback, better-auth continues the authorization, not `next`.
 *
 * When email is on, the route first sends a signed query to `/login`, where
 * the main sign-in is a code in an email (PLAN.md, D18, rule 6).
 * The Pocket ID button of `/login` comes back here with
 * `sign_in_with=pocket-id`.
 */
export const Route = createFileRoute("/auth/sign-in")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const oauthQuery = (() => {
          if (!requestUrl.searchParams.has("sig")) return null;
          const parameters = new URLSearchParams(requestUrl.searchParams);
          parameters.delete("canonical");
          parameters.delete("sign_in_with");
          return parameters.toString();
        })();
        const isPocketIdSelected =
          requestUrl.searchParams.get("sign_in_with") === pocketIdProviderId;
        const next = resolveRedirectPath({
          next:
            oauthQuery === null ? requestUrl.searchParams.get("next") : null,
          fallback: "/",
        });
        // The callback opens on the host of APP_URL. The state cookie must be
        // on the same host, thus start the sign-in again on that host. Use
        // the Host header, because behind a proxy the request URL holds the
        // internal host. The parameter `canonical` stops a redirect loop.
        const appUrl = new URL(env.APP_URL);
        const requestHost =
          request.headers.get("x-forwarded-host") ??
          request.headers.get("host");
        if (
          requestHost &&
          requestHost !== appUrl.host &&
          !requestUrl.searchParams.has("canonical")
        ) {
          const canonicalUrl = new URL("/auth/sign-in", appUrl);
          canonicalUrl.search =
            oauthQuery === null
              ? new URLSearchParams({ next }).toString()
              : oauthQuery;
          canonicalUrl.searchParams.set("canonical", "1");
          if (isPocketIdSelected) {
            canonicalUrl.searchParams.set("sign_in_with", pocketIdProviderId);
          }
          return new Response(null, {
            status: 302,
            headers: { location: canonicalUrl.href },
          });
        }
        if (oauthQuery !== null && isEmailEnabled && !isPocketIdSelected) {
          const loginUrl = new URL("/login", appUrl);
          loginUrl.searchParams.set("oauth_query", oauthQuery);
          return new Response(null, {
            status: 302,
            headers: { location: loginUrl.href },
          });
        }
        const { headers, response } = await auth.api.signInSocial({
          body: {
            provider: pocketIdProviderId,
            callbackURL: new URL(next, env.APP_URL).href,
            errorCallbackURL: new URL(
              "/login?error=callback_failed",
              env.APP_URL,
            ).href,
            disableRedirect: true,
            ...(oauthQuery === null ? {} : { oauth_query: oauthQuery }),
          },
          headers: request.headers,
          returnHeaders: true,
        });
        const location =
          response.url ??
          new URL("/login?error=sign_in_failed", env.APP_URL).href;
        // Send the state cookie with the redirect.
        const responseHeaders = new Headers({ location });
        for (const cookie of headers.getSetCookie()) {
          responseHeaders.append("set-cookie", cookie);
        }
        return new Response(null, { status: 302, headers: responseHeaders });
      },
    },
  },
});
