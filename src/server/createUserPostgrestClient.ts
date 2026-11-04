import {
  type PostgrestDbClient,
  createPostgrestClient,
} from "../db/createPostgrestClient.ts";
import { env } from "../env.ts";

/**
 * Makes the user client: a PostgREST client with the role authenticated and
 * the user ID as `sub` (PLAN.md, D3). Call it only after a session check,
 * with the ID of the session. `authMiddleware` gives it as `context.db`.
 */
export const createUserPostgrestClient = ({
  userId,
}: {
  userId: string;
}): PostgrestDbClient =>
  createPostgrestClient({
    restUrl: env.POSTGREST_URL,
    jwtSecret: env.POSTGREST_JWT_SECRET,
    userId,
  });
