import { type UserRole, readUserRole } from "../core/auth/userRoles.ts";
import { auth } from "./auth.ts";
import { getRequestHeaders } from "@tanstack/react-start/server";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  /** The role of the user (PLAN.md, D19). */
  role: UserRole;
};

/**
 * Returns the signed-in user of the current request, or null. better-auth
 * reads the session cookie. Call it only in server code.
 *
 * An unknown role gives `guest`, the role with the fewest rights.
 */
export const getSessionUser = async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) {
    return null;
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: readUserRole(session.user),
  };
};
