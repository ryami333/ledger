import { env } from "../env.ts";
import { auth, pocketIdProviderId } from "../server/auth.ts";
import { resolveRedirectPath } from "../core/auth/resolveRedirectPath.ts";
import { createFileRoute } from "@tanstack/react-router";

/**
 * Starts the sign-in with Pocket ID. better-auth makes the state and the PKCE
 * code verifier, and stores them in a cookie. Then the browser goes to Pocket
 * ID. Pocket ID sends the browser back to `/api/auth/callback/pocket-id`, and
 * better-auth then opens `next`.
 */
export const Route = createFileRoute("/auth/sign-in")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const next = resolveRedirectPath({
          next: requestUrl.searchParams.get("next"),
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
          canonicalUrl.searchParams.set("next", next);
          canonicalUrl.searchParams.set("canonical", "1");
          return new Response(null, {
            status: 302,
            headers: { location: canonicalUrl.href },
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
