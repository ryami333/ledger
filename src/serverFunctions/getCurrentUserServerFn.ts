import { getSessionUser } from "../server/getSessionUser.ts";
import { createServerFn } from "@tanstack/react-start";

/** Returns the signed-in user, or null. */
export const getCurrentUserServerFn = createServerFn({ method: "GET" }).handler(
  () => getSessionUser(),
);
