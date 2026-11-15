/**
 * The roles of a user (PLAN.md, D19). The column `better_auth.users.role`
 * accepts the same values. `guest` is the default.
 */
export const userRoles = ["admin", "guest"] as const;

export type UserRole = (typeof userRoles)[number];

/** Tells if a value is a role of a user. */
export const isUserRole = (input: unknown): input is UserRole =>
  typeof input === "string" && userRoles.some((role) => role === input);
