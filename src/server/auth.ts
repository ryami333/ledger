import { env } from "../env.ts";
import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import pg from "pg";

/** better-auth calls the provider with this ID, also in the callback URL. */
export const pocketIdProviderId = "pocket-id";

const timestampFields = { createdAt: "created_at", updatedAt: "updated_at" };

/**
 * The sign-in of the web app (PLAN.md, D3). Pocket ID is the only provider.
 * Its OIDC client allows only one Pocket ID user group, thus Pocket
 * ID decides who has an account. There is no email or password sign-in.
 *
 * better-auth keeps the users and the sessions in the schema better_auth.
 * db/schemas/090_better_auth.sql defines the tables, with the snake_case
 * names of the field mapping below. better-auth does not make them.
 */
export const auth = betterAuth({
  telemetry: { enabled: false },
  database: new pg.Pool({
    connectionString: env.DATABASE_URL,
    application_name: "ledger-auth",
    options: "-c search_path=better_auth",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  advanced: { database: { generateId: "uuid" } },
  user: {
    modelName: "users",
    fields: { emailVerified: "email_verified", ...timestampFields },
  },
  session: {
    modelName: "sessions",
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      ...timestampFields,
    },
  },
  account: {
    modelName: "accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      ...timestampFields,
    },
    // The first Pocket ID sign-in links to an existing user with the same
    // email, for example the user of the seed.
    accountLinking: { enabled: true, trustedProviders: [pocketIdProviderId] },
  },
  verification: {
    modelName: "verifications",
    fields: { expiresAt: "expires_at", ...timestampFields },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: pocketIdProviderId,
          clientId: env.POCKET_ID_CLIENT_ID,
          clientSecret: env.POCKET_ID_CLIENT_SECRET,
          scopes: ["openid", "email", "profile"],
          discoveryUrl: `${env.POCKET_ID_ISSUER}/.well-known/openid-configuration`,
          pkce: true,
        },
      ],
    }),
    // Must be the last plugin.
    tanstackStartCookies(),
  ],
});
