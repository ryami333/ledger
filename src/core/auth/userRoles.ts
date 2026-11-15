/**
 * The roles of a user (PLAN.md, D19). The column `better_auth.users.role`
 * accepts the same values. `guest` is the default.
 */
export const userRoles = ["admin", "guest"] as const;

export type UserRole = (typeof userRoles)[number];

/** Tells if a value is a role of a user. */
export const isUserRole = (input: unknown): input is UserRole =>
  typeof input === "string" && userRoles.some((role) => role === input);

/**
 * Reads the role of a user row of better-auth. The types of better-auth do
 * not always hold the additional field `role`. An unknown or missing value
 * gives `guest`, the role with the fewest rights.
 */
export const readUserRole = (user: object): UserRole =>
  "role" in user && isUserRole(user.role) ? user.role : "guest";
