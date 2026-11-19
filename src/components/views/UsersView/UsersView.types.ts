import type { UserRole } from "../../../core/auth/userRoles.ts";

/** One user on the page `/users`. */
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** The date of the first sign-in or of the invitation, as `YYYY-MM-DD`. */
  createdDate: string;
  /** The spaces of a guest (PLAN.md, D20). Empty for an admin. */
  spaceIds: string[];
};

/** One space that an admin can give to a guest. */
export type SpaceOption = {
  id: string;
  title: string;
};
