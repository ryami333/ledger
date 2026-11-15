import { authMiddleware } from "./authMiddleware.ts";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

/**
 * Refuses a server function call of a user that is not an admin, with 403
 * (PLAN.md, D19, rule 7). The tables of better_auth are not in PostgREST,
 * thus RLS cannot check the role. This middleware checks it in the server.
 */
export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (context.user.role !== "admin") {
      setResponseStatus(403);
      throw new Error("Only an admin can do this.");
    }
    return next();
  });
