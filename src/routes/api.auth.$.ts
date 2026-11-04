import { auth } from "../server/auth.ts";
import { createFileRoute } from "@tanstack/react-router";

/**
 * The endpoints of better-auth, for example the OIDC callback
 * `/api/auth/callback/pocket-id`.
 */
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
