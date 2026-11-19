import { isClaudeClientMetadataUrl } from "../core/auth/isClaudeClientMetadataUrl.ts";
import { pocketIdProviderId } from "../core/auth/pocketIdProviderId.ts";
import { resolveRoleOnUserCreate } from "../core/auth/resolveRoleOnUserCreate.ts";
import { snakeCaseModel } from "../core/auth/snakeCaseModel.ts";
import { renderSignInCodeEmail } from "../core/email/renderSignInCodeEmail.ts";
import { SIGN_IN_CODE_LENGTH } from "../core/forms/signInCodeSchema.ts";
import { ledgerScopes } from "../core/mcp/ledgerScopes.ts";
import { env } from "../env.ts";
import { isEmailEnabled, sendEmail } from "./sendEmail.ts";
import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { emailOTP, genericOAuth, jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import pg from "pg";
import { Temporal } from "temporal-polyfill";

/**
 * The MCP server (PLAN.md, D15). Each access token has this URL as its
 * audience.
 */
export const mcpResourceUrl = new URL("/mcp", env.APP_URL).href;

const timestampFields = { createdAt: "created_at", updatedAt: "updated_at" };

/** A sign-in code expires after this time (PLAN.md, D18, rule 5). */
export const SIGN_IN_CODE_EXPIRY = Temporal.Duration.from({ minutes: 10 });

/**
 * The sign-in with a code in an email (PLAN.md, D18). It signs in a user
 * that exists, and never makes a user. With `disableSignUp`, better-auth
 * sends nothing to an unknown address, and gives the same answer.
 *
 * The send does not block the answer, so that the duration of the answer
 * also does not tell if the user exists. sendEmail logs each failure.
 */
const emailOtpPlugin = emailOTP({
  disableSignUp: true,
  otpLength: SIGN_IN_CODE_LENGTH,
  expiresIn: SIGN_IN_CODE_EXPIRY.total({ unit: "seconds" }),
  storeOTP: "hashed",
  allowedAttempts: 5,
  // The limit of the send endpoint. The sign-in endpoint has its own limit
  // in rateLimit.customRules below.
  rateLimit: {
    window: Temporal.Duration.from({ minutes: 10 }).total({ unit: "seconds" }),
    max: 5,
  },
  sendVerificationOTP: async ({ email, otp, type }) => {
    if (type !== "sign-in") {
      console.log("sendVerificationOTP skipped", { type });
      return;
    }
    console.log("sendVerificationOTP sending");
    sendEmail({
      to: email,
      email: renderSignInCodeEmail({
        code: otp,
        expiresInMinutes: SIGN_IN_CODE_EXPIRY.total({ unit: "minutes" }),
      }),
      purpose: "sign-in-code",
    }).catch(() => {
      // sendEmail logs the error code.
    });
  },
});

/**
 * The sign-in of the web app (PLAN.md, D3 and D18). A user signs in with
 * Pocket ID or with a code in an email. The OIDC client of Pocket ID allows only
 * one Pocket ID user group. There is no email or password sign-in.
 *
 * The role of a user (D19) is set one time, when the user is made: admin
 * for the Pocket ID callback, else guest. Nothing changes it later.
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
  advanced: {
    database: { generateId: "uuid" },
    // Behind Cloudflare, the client IP address is in cf-connecting-ip. The
    // rate limit counts the requests of each IP address.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  // On in each environment, so that the limits of the sign-in code (D18,
  // rule 5) are also active in local tests. The storage is the memory of the
  // process. The plugin gives its limit (5 in 10 minutes) to each of its
  // endpoints. The sign-in endpoint gets a looser limit, for users behind one
  // IP address. Each code also allows only 5 wrong attempts.
  rateLimit: {
    enabled: true,
    customRules: {
      "/sign-in/email-otp": {
        window: Temporal.Duration.from({ minutes: 1 }).total({
          unit: "seconds",
        }),
        max: 10,
      },
    },
  },
  user: {
    modelName: "users",
    fields: { emailVerified: "email_verified", ...timestampFields },
    additionalFields: {
      // No client request can set the role (input: false).
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "guest",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // The context is the better-auth endpoint that makes the user, or
        // null for a direct call, for example an invitation.
        before: async (user, context) => {
          const providerId: unknown = context?.params?.id;
          const role = resolveRoleOnUserCreate({
            endpointPath: context?.path,
            providerId: typeof providerId === "string" ? providerId : undefined,
          });
          return { data: { ...user, role } };
        },
      },
    },
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
    // jwt() signs the access tokens. The login page /auth/sign-in sends the
    // user to Pocket ID, and better-auth then continues the authorization.
    // After a sign-in with a code, /login opens the authorize endpoint (D18,
    // rule 6).
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
    // Only with an API key of Resend (D18, rule 7).
    ...(isEmailEnabled ? [emailOtpPlugin] : []),
    // Must be the last plugin.
    tanstackStartCookies(),
  ],
});
