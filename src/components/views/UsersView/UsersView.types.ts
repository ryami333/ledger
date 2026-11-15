import type { UserRole } from "../../../core/auth/userRoles.ts";

/** One user on the page `/users`. */
export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** The date of the first sign-in or of the invitation, as `YYYY-MM-DD`. */
  createdDate: string;
};
