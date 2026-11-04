import { auth } from "../server/auth.ts";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

/** Ends the session of the user and removes the session cookie. */
export const signOutServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { success } = await auth.api.signOut({
      headers: getRequestHeaders(),
    });
    if (!success) {
      throw new Error("The sign-out failed.");
    }
  },
);
