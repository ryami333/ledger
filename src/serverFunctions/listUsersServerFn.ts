import { readUserRole } from "../core/auth/userRoles.ts";
import { env } from "../env.ts";
import { adminMiddleware } from "../server/adminMiddleware.ts";
import { auth } from "../server/auth.ts";
import { createServerFn } from "@tanstack/react-start";
import { Temporal } from "temporal-polyfill";

/**
 * Returns all users for the page `/users`, the oldest first (PLAN.md, D19,
 * rule 3). Only an admin can call it. better-auth reads better_auth.users
 * directly, because PostgREST cannot read that schema.
 */
export const listUsersServerFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const { internalAdapter } = await auth.$context;
    const users = await internalAdapter.listUsers(undefined, undefined, {
      field: "createdAt",
      direction: "asc",
    });
    return {
      locale: env.APP_LOCALE,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: readUserRole(user),
        // The date of the first sign-in or of the invitation.
        createdDate: Temporal.Instant.fromEpochMilliseconds(
          user.createdAt.getTime(),
        )
          .toZonedDateTimeISO(env.APP_TIME_ZONE)
          .toPlainDate()
          .toString(),
      })),
    };
  });
