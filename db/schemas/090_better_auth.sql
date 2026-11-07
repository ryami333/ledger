-- The tables of better-auth, the sign-in of the web app (PLAN.md, D3). They
-- are in their own schema, because PostgREST exposes only public. The web app
-- connects to them directly with DATABASE_URL. The four tables are in one
-- file, because better-auth defines them together.
--
-- better-auth does not make these tables. This file is the only definition.
-- After a better-auth upgrade, compare it with `getMigrations` of better-auth
-- (see src/server/auth.ts). The names are snake_case through the
-- field mapping in auth.ts. better-auth sets created_at and updated_at itself.
CREATE SCHEMA IF NOT EXISTS "better_auth";

CREATE TABLE IF NOT EXISTS "better_auth"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "email_verified" boolean DEFAULT false NOT NULL,
    "image" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "better_auth"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "better_auth"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "account_id" "text" NOT NULL,
    "provider_id" "text" NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "id_token" "text",
    "access_token_expires_at" timestamp with time zone,
    "refresh_token_expires_at" timestamp with time zone,
    "scope" "text",
    "password" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "better_auth"."verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "value" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

-- No policy: RLS refuses all rows to anon and authenticated.
-- Only the owner role of DATABASE_URL reads these tables.
ALTER TABLE "better_auth"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."verifications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY "better_auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");

ALTER TABLE ONLY "better_auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "sessions_token_key" UNIQUE ("token"),
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."verifications"
    ADD CONSTRAINT "verifications_pkey" PRIMARY KEY ("id");

CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "better_auth"."sessions" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "accounts_user_id_idx" ON "better_auth"."accounts" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "better_auth"."verifications" USING "btree" ("identifier");

-- The OAuth 2.1 authorization server for the MCP clients (PLAN.md, D15): the
-- plugins jwt(), mcp(), and cimd() of better-auth. As for the tables above,
-- this file is the only definition. src/server/auth.ts maps each field to
-- these snake_case names. The arrays are jsonb, as better-auth writes them.

-- The signing keys of the access tokens. better-auth encrypts private_key.
CREATE TABLE IF NOT EXISTS "better_auth"."jwks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "public_key" "text" NOT NULL,
    "private_key" "text" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "expires_at" timestamp with time zone,
    "alg" "text",
    "crv" "text"
);

-- One row for each OAuth client. A Claude app gets a row from its Client ID
-- Metadata Document: client_id is the URL of the document.
CREATE TABLE IF NOT EXISTS "better_auth"."oauth_clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "client_secret" "text",
    "client_discovery_id" "text",
    "disabled" boolean,
    "skip_consent" boolean,
    "enable_end_session" boolean,
    "subject_type" "text",
    "scopes" "jsonb",
    "client_credentials_scopes" "jsonb",
    "user_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name" "text",
    "uri" "text",
    "icon" "text",
    "contacts" "jsonb",
    "tos" "text",
    "policy" "text",
    "software_id" "text",
    "software_version" "text",
    "software_statement" "text",
    "redirect_uris" "jsonb" NOT NULL,
    "post_logout_redirect_uris" "jsonb",
    "backchannel_logout_uri" "text",
    "backchannel_logout_session_required" boolean,
    "token_endpoint_auth_method" "text",
    "application_type" "text",
    "jwks" "text",
    "jwks_uri" "text",
    "grant_types" "jsonb",
    "response_types" "jsonb",
    "require_pkce" boolean,
    "dpop_bound_access_tokens" boolean,
    "reference_id" "text",
    "metadata" "jsonb"
);

-- The protected resources. mcp() adds one row: <APP_URL>/mcp.
CREATE TABLE IF NOT EXISTS "better_auth"."oauth_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "identifier" "text" NOT NULL,
    "name" "text" NOT NULL,
    "access_token_ttl" integer,
    "refresh_token_ttl" integer,
    "signing_algorithm" "text",
    "signing_key_id" "text",
    "allowed_scopes" "jsonb",
    "custom_claims" "jsonb",
    "dpop_bound_access_tokens_required" boolean,
    "disabled" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "policy_version" integer,
    "metadata" "jsonb"
);

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_client_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "resource_id" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_refresh_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "session_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "reference_id" "text",
    "authorization_code_id" "text",
    "resources" "jsonb",
    "requested_user_info_claims" "jsonb",
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "revoked" timestamp with time zone,
    "rotated_at" timestamp with time zone,
    "rotation_replay_response" "text",
    "rotation_replay_expires_at" timestamp with time zone,
    "auth_time" timestamp with time zone,
    "confirmation" "jsonb",
    "scopes" "jsonb" NOT NULL
);

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_access_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token" "text" NOT NULL,
    "client_id" "text" NOT NULL,
    "session_id" "uuid",
    "user_id" "uuid",
    "reference_id" "text",
    "authorization_code_id" "text",
    "resources" "jsonb",
    "requested_user_info_claims" "jsonb",
    "refresh_id" "uuid",
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "revoked" timestamp with time zone,
    "confirmation" "jsonb",
    "scopes" "jsonb" NOT NULL
);

-- The consent of a user for a client, from the page /oauth/consent.
CREATE TABLE IF NOT EXISTS "better_auth"."oauth_consents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "user_id" "uuid",
    "reference_id" "text",
    "resources" "jsonb",
    "requested_user_info_claims" "jsonb",
    "scopes" "jsonb" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_client_assertions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL
);

ALTER TABLE "better_auth"."jwks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_client_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_access_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "better_auth"."oauth_client_assertions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE ONLY "better_auth"."jwks"
    ADD CONSTRAINT "jwks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "better_auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "oauth_clients_client_id_key" UNIQUE ("client_id"),
    ADD CONSTRAINT "oauth_clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."oauth_resources"
    ADD CONSTRAINT "oauth_resources_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "oauth_resources_identifier_key" UNIQUE ("identifier");

ALTER TABLE ONLY "better_auth"."oauth_client_resources"
    ADD CONSTRAINT "oauth_client_resources_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "oauth_client_resources_client_id_resource_id_key" UNIQUE ("client_id", "resource_id"),
    ADD CONSTRAINT "oauth_client_resources_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "better_auth"."oauth_clients"("client_id") ON DELETE CASCADE,
    ADD CONSTRAINT "oauth_client_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "better_auth"."oauth_resources"("identifier") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."oauth_refresh_tokens"
    ADD CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "oauth_refresh_tokens_token_key" UNIQUE ("token"),
    ADD CONSTRAINT "oauth_refresh_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "better_auth"."oauth_clients"("client_id") ON DELETE CASCADE,
    ADD CONSTRAINT "oauth_refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "better_auth"."sessions"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "oauth_refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."oauth_access_tokens"
    ADD CONSTRAINT "oauth_access_tokens_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "oauth_access_tokens_token_key" UNIQUE ("token"),
    ADD CONSTRAINT "oauth_access_tokens_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "better_auth"."oauth_clients"("client_id") ON DELETE CASCADE,
    ADD CONSTRAINT "oauth_access_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "better_auth"."sessions"("id") ON DELETE SET NULL,
    ADD CONSTRAINT "oauth_access_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE,
    ADD CONSTRAINT "oauth_access_tokens_refresh_id_fkey" FOREIGN KEY ("refresh_id") REFERENCES "better_auth"."oauth_refresh_tokens"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id"),
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "better_auth"."oauth_clients"("client_id") ON DELETE CASCADE,
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "better_auth"."oauth_client_assertions"
    ADD CONSTRAINT "oauth_client_assertions_pkey" PRIMARY KEY ("id");

CREATE INDEX IF NOT EXISTS "oauth_clients_user_id_idx" ON "better_auth"."oauth_clients" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "oauth_client_resources_resource_id_idx" ON "better_auth"."oauth_client_resources" USING "btree" ("resource_id");
CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_client_id_idx" ON "better_auth"."oauth_refresh_tokens" USING "btree" ("client_id");
CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_session_id_idx" ON "better_auth"."oauth_refresh_tokens" USING "btree" ("session_id");
CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_user_id_idx" ON "better_auth"."oauth_refresh_tokens" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_authorization_code_id_idx" ON "better_auth"."oauth_refresh_tokens" USING "btree" ("authorization_code_id");
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_client_id_idx" ON "better_auth"."oauth_access_tokens" USING "btree" ("client_id");
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_session_id_idx" ON "better_auth"."oauth_access_tokens" USING "btree" ("session_id");
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_user_id_idx" ON "better_auth"."oauth_access_tokens" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_authorization_code_id_idx" ON "better_auth"."oauth_access_tokens" USING "btree" ("authorization_code_id");
CREATE INDEX IF NOT EXISTS "oauth_access_tokens_refresh_id_idx" ON "better_auth"."oauth_access_tokens" USING "btree" ("refresh_id");
CREATE INDEX IF NOT EXISTS "oauth_consents_client_id_idx" ON "better_auth"."oauth_consents" USING "btree" ("client_id");
CREATE INDEX IF NOT EXISTS "oauth_consents_user_id_idx" ON "better_auth"."oauth_consents" USING "btree" ("user_id");
