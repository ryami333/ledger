import { auth } from "./auth.ts";
import { getRequestHeaders } from "@tanstack/react-start/server";

export type SessionUser = { id: string; name: string; email: string };

/**
 * Returns the signed-in user of the current request, or null. better-auth
 * reads the session cookie. Call it only in server code.
 */
export const getSessionUser = async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  return session
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      }
    : null;
};
