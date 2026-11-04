import type { LedgerDatabase } from "./LedgerDatabase.ts";
import { signPostgrestJwt } from "./signPostgrestJwt.ts";
import { PostgrestClient } from "@supabase/postgrest-js";

/**
 * A PostgREST client with the generated `Database` types, and the nullable
 * arguments of `LedgerDatabase`.
 */
export type PostgrestDbClient = PostgrestClient<LedgerDatabase>;

/**
 * Makes a PostgREST client that signs a new JWT for each request, with the
 * role authenticated and the user ID as `sub`. RLS and the actor triggers
 * apply to each query.
 *
 * Call it only with the ID of a session that better-auth checked. The web app
 * calls it through `createUserPostgrestClient`, which reads the env.
 */
export const createPostgrestClient = ({
  restUrl,
  jwtSecret,
  userId,
}: {
  restUrl: string;
  jwtSecret: string;
  userId: string;
}): PostgrestDbClient =>
  new PostgrestClient<LedgerDatabase>(restUrl, {
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set(
        "authorization",
        `Bearer ${await signPostgrestJwt({ jwtSecret, userId })}`,
      );
      return fetch(input, { ...init, headers });
    },
  });
