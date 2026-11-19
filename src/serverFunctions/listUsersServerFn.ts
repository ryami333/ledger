import { readUserRole } from "../core/auth/userRoles.ts";
import { env } from "../env.ts";
import { adminMiddleware } from "../server/adminMiddleware.ts";
import { auth } from "../server/auth.ts";
import { throwDatabaseError } from "../server/throwDatabaseError.ts";
import { createServerFn } from "@tanstack/react-start";
import { Temporal } from "temporal-polyfill";

/**
 * Returns all users for the page `/users`, the oldest first (PLAN.md, D19,
 * rule 3). Only an admin can call it. better-auth reads better_auth.users
 * directly, because PostgREST cannot read that schema.
 *
 * It also returns all spaces, and the spaces of each guest (D20). The user
 * client reads them, and RLS gives an admin all rows.
 */
export const listUsersServerFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    const { internalAdapter } = await auth.$context;
    const [users, spacesResult, spaceGuestsResult] = await Promise.all([
      internalAdapter.listUsers(undefined, undefined, {
        field: "createdAt",
        direction: "asc",
      }),
      context.db
        .from("spaces")
        .select("id, title")
        .order("title", { ascending: true }),
      context.db.from("space_guests").select("space_id, user_id"),
    ]);
    if (spacesResult.error || spaceGuestsResult.error) {
      return throwDatabaseError({
        operation: "listUsersServerFn",
        error: spacesResult.error ?? spaceGuestsResult.error,
        messages: { fallback: "The spaces cannot be read." },
      });
    }
    const spaceGuests = spaceGuestsResult.data;
    return {
      locale: env.APP_LOCALE,
      spaces: spacesResult.data,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: readUserRole(user),
        spaceIds: spaceGuests
          .filter((spaceGuest) => spaceGuest.user_id === user.id)
          .map((spaceGuest) => spaceGuest.space_id),
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
