import { readSecretFiles } from "./core/env/readSecretFiles.ts";
import { createEnv } from "@t3-oss/env-core";
import { readFileSync } from "node:fs";
import { z } from "zod";

// Docker secrets: copy each <NAME>_FILE into <NAME> before the validation.
// pg reads PGPASSWORD from process.env, thus write it there.
Object.assign(
  process.env,
  readSecretFiles({
    env: process.env,
    readFile: (path) => readFileSync(path, "utf8"),
  }),
);

export const env = createEnv({
  server: {
    /** The public URL of the web app, for example `http://127.0.0.1:3001`. */
    APP_URL: z.url().default("http://127.0.0.1:3001"),
    /**
     * The locale of all amounts and dates (PLAN.md, D4). One fixed locale on
     * the server and in the browser prevents a hydration mismatch.
     */
    APP_LOCALE: z.string().min(1).default("en-IE"),
    /**
     * The time zone of the default transaction date and of the timestamps in
     * the UI (PLAN.md, D11).
     */
    APP_TIME_ZONE: z.string().min(1).default("Europe/Berlin"),
    /** The URL of PostgREST, for example `http://127.0.0.1:54331`. */
    POSTGREST_URL: z.url(),
    /**
     * The HS256 secret of PostgREST. The web app signs a short JWT with it for
     * each request, with the role authenticated and the ID of the user.
     */
    POSTGREST_JWT_SECRET: z.string().min(32),
    /** The secret of better-auth. It signs the session cookies. */
    BETTER_AUTH_SECRET: z.string().min(32),
    /**
     * A direct session connection to Postgres, as the owner role.
     * better-auth and the migration script use it.
     */
    DATABASE_URL: z.url(),
    /** The OIDC client of ledger in Pocket ID (PLAN.md, D3). */
    POCKET_ID_ISSUER: z.url(),
    POCKET_ID_CLIENT_ID: z.string().min(1),
    POCKET_ID_CLIENT_SECRET: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
