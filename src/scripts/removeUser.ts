/**
 * Removes one user, also an admin (PLAN.md, D19, rule 8):
 *
 *     yarn user:remove --email <email>
 *
 * The delete also deletes the sessions, the accounts, the OAuth tokens, the
 * linked members, and the default space of the user. The transactions stay,
 * with no created_by. The page /users removes only guests.
 *
 * Run it after you remove a user from the Pocket ID user group. Otherwise the
 * user can still sign in with a sign-in code.
 */
import { env } from "../env.ts";
import { parseArgs } from "node:util";
import pg from "pg";

const { values } = parseArgs({
  options: { email: { type: "string" } },
  strict: true,
});

if (!values.email) {
  throw new Error("Usage: yarn user:remove --email <email>");
}

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  application_name: "ledger-remove-user",
});
await client.connect();

try {
  const { rows } = await client.query<{ id: string; role: string }>(
    "delete from better_auth.users where email = lower($1) returning id, role",
    [values.email.trim()],
  );
  const [removedUser] = rows;
  if (removedUser) {
    console.log("Removed the user.", {
      userId: removedUser.id,
      role: removedUser.role,
    });
  } else {
    console.log("No user has this email. Nothing changed.");
    process.exitCode = 1;
  }
} finally {
  await client.end();
}
