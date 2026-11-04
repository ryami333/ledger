import { createUserPostgrestClient } from "./createUserPostgrestClient.ts";
import { getSessionUser } from "./getSessionUser.ts";
import { createMiddleware } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";

/**
 * Refuses a server function call with no signed-in user. It gives the user
 * client (`context.db`) and the user ID to the handler.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await getSessionUser();
    if (!user) {
      setResponseStatus(401);
      throw new Error("Sign in to continue.");
    }
    return next({
      context: {
        db: createUserPostgrestClient({ userId: user.id }),
        userId: user.id,
      },
    });
  },
);
