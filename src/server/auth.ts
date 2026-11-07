import { isClaudeClientMetadataUrl } from "../core/auth/isClaudeClientMetadataUrl.ts";
import { snakeCaseModel } from "../core/auth/snakeCaseModel.ts";
import { ledgerScopes } from "../core/mcp/ledgerScopes.ts";
import { env } from "../env.ts";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { genericOAuth, jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import pg from "pg";

/** better-auth calls the provider with this ID, also in the callback URL. */
export const pocketIdProviderId = "pocket-id";

/**
 * The MCP server (PLAN.md, D15). Each access token has this URL as its
 * audience.
 */
export const mcpResourceUrl = new URL("/mcp", env.APP_URL).href;

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
    // The OAuth 2.1 authorization server for the MCP clients (PLAN.md, D15).
    // jwt() signs the access tokens. The sign-in stays with Pocket ID: the
    // login page /auth/sign-in sends the user to Pocket ID, and better-auth
    // then continues the authorization.
    jwt({
      schema: {
        jwks: snakeCaseModel({
          modelName: "jwks",
          fields: ["publicKey", "privateKey", "createdAt", "expiresAt"],
        }),
      },
    }),
    mcp({
      resource: mcpResourceUrl,
      loginPage: "/auth/sign-in",
      consentPage: "/oauth/consent",
      // A user is always present. There is no machine-to-machine client.
      grantTypes: ["authorization_code", "refresh_token"],
      scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        ledgerScopes.read,
        ledgerScopes.write,
      ],
      schema: {
        oauthClient: snakeCaseModel({
          modelName: "oauth_clients",
          fields: [
            "clientId",
            "clientSecret",
            "clientDiscoveryId",
            "skipConsent",
            "enableEndSession",
            "subjectType",
            "clientCredentialsScopes",
            "userId",
            "createdAt",
            "updatedAt",
            "softwareId",
            "softwareVersion",
            "softwareStatement",
            "redirectUris",
            "postLogoutRedirectUris",
            "backchannelLogoutUri",
            "backchannelLogoutSessionRequired",
            "tokenEndpointAuthMethod",
            "applicationType",
            "jwksUri",
            "grantTypes",
            "responseTypes",
            "requirePKCE",
            "dpopBoundAccessTokens",
            "referenceId",
          ],
        }),
        oauthResource: snakeCaseModel({
          modelName: "oauth_resources",
          fields: [
            "accessTokenTtl",
            "refreshTokenTtl",
            "signingAlgorithm",
            "signingKeyId",
            "allowedScopes",
            "customClaims",
            "dpopBoundAccessTokensRequired",
            "createdAt",
            "updatedAt",
            "policyVersion",
          ],
        }),
        oauthClientResource: snakeCaseModel({
          modelName: "oauth_client_resources",
          fields: ["clientId", "resourceId", "createdAt"],
        }),
        oauthRefreshToken: snakeCaseModel({
          modelName: "oauth_refresh_tokens",
          fields: [
            "clientId",
            "sessionId",
            "userId",
            "referenceId",
            "authorizationCodeId",
            "requestedUserInfoClaims",
            "expiresAt",
            "createdAt",
            "rotatedAt",
            "rotationReplayResponse",
            "rotationReplayExpiresAt",
            "authTime",
          ],
        }),
        oauthAccessToken: snakeCaseModel({
          modelName: "oauth_access_tokens",
          fields: [
            "clientId",
            "sessionId",
            "userId",
            "referenceId",
            "authorizationCodeId",
            "requestedUserInfoClaims",
            "refreshId",
            "expiresAt",
            "createdAt",
          ],
        }),
        oauthConsent: snakeCaseModel({
          modelName: "oauth_consents",
          fields: [
            "clientId",
            "userId",
            "referenceId",
            "requestedUserInfoClaims",
            "createdAt",
            "updatedAt",
          ],
        }),
        oauthClientAssertion: snakeCaseModel({
          modelName: "oauth_client_assertions",
          fields: ["expiresAt"],
        }),
      },
    }),
    // The Claude apps identify themselves with a Client ID Metadata Document.
    // There is no Dynamic Client Registration.
    cimd({
      fetchClientMetadataResource,
      metadataProfile: "mcp-2026-07-28",
      isMetadataDocumentUrlAllowed: isClaudeClientMetadataUrl,
    }),
    // Must be the last plugin.
    tanstackStartCookies(),
  ],
});
