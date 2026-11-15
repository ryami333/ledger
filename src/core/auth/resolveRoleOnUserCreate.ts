import { pocketIdProviderId } from "./pocketIdProviderId.ts";
import type { UserRole } from "./userRoles.ts";

/**
 * Returns the role of a new user (PLAN.md, D19, rule 1). Only the Pocket ID
 * callback of better-auth makes an admin. Each other way to make a user, for
 * example an invitation or a script, makes a guest.
 *
 * `endpointPath` is the path of the better-auth endpoint that makes the user,
 * with no `/api/auth`. Through the router of better-auth, it is the real path,
 * for example `/callback/pocket-id`. A direct `auth.api` call gives the path
 * pattern `/callback/:id`. `providerId` is the `id` parameter of the path.
 */
export const resolveRoleOnUserCreate = ({
  endpointPath,
  providerId,
}: {
  endpointPath: string | undefined;
  providerId: string | undefined;
}): UserRole => {
  if (providerId !== pocketIdProviderId) return "guest";
  if (
    endpointPath === `/callback/${pocketIdProviderId}` ||
    endpointPath === "/callback/:id"
  ) {
    return "admin";
  }
  return "guest";
};
