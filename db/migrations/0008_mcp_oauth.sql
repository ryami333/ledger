-- Adds the tables of the OAuth 2.1 authorization server for the MCP clients
-- (PLAN.md, D15): jwks for the plugin jwt(), and the oauth_* tables for the
-- plugins mcp() and cimd() of better-auth. The tables are in the schema
-- better_auth. No PostgREST role can read them.
--
-- Safe to run two times: each table and each index uses "if not exists", and
-- each foreign key is dropped with "if exists" before it is added.
--
-- Rollback: drop the tables oauth_access_tokens, oauth_refresh_tokens,
-- oauth_consents, oauth_client_resources, oauth_resources, oauth_clients,
-- oauth_client_assertions, and jwks in the schema better_auth, in this order.
-- No earlier migration defines them.

CREATE TABLE IF NOT EXISTS "better_auth"."jwks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "public_key" text NOT NULL, "private_key" text NOT NULL, "created_at" timestamp with time zone NOT NULL, "expires_at" timestamp with time zone, "alg" text, "crv" text, CONSTRAINT "jwks_pkey" PRIMARY KEY (id));

ALTER TABLE "better_auth"."jwks" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_access_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token" text NOT NULL, "client_id" text NOT NULL, "session_id" uuid, "user_id" uuid, "reference_id" text, "authorization_code_id" text, "resources" jsonb, "requested_user_info_claims" jsonb, "refresh_id" uuid, "expires_at" timestamp with time zone NOT NULL, "created_at" timestamp with time zone NOT NULL, "revoked" timestamp with time zone, "confirmation" jsonb, "scopes" jsonb NOT NULL, CONSTRAINT "oauth_access_tokens_pkey" PRIMARY KEY (id), CONSTRAINT "oauth_access_tokens_token_key" UNIQUE (token));

ALTER TABLE "better_auth"."oauth_access_tokens" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_client_assertions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "expires_at" timestamp with time zone NOT NULL, CONSTRAINT "oauth_client_assertions_pkey" PRIMARY KEY (id));

ALTER TABLE "better_auth"."oauth_client_assertions" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_client_resources" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "client_id" text NOT NULL, "resource_id" text NOT NULL, "metadata" jsonb, "created_at" timestamp with time zone, CONSTRAINT "oauth_client_resources_client_id_resource_id_key" UNIQUE (client_id, resource_id), CONSTRAINT "oauth_client_resources_pkey" PRIMARY KEY (id));

ALTER TABLE "better_auth"."oauth_client_resources" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_clients" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "client_id" text NOT NULL, "client_secret" text, "client_discovery_id" text, "disabled" boolean, "skip_consent" boolean, "enable_end_session" boolean, "subject_type" text, "scopes" jsonb, "client_credentials_scopes" jsonb, "user_id" uuid, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "name" text, "uri" text, "icon" text, "contacts" jsonb, "tos" text, "policy" text, "software_id" text, "software_version" text, "software_statement" text, "redirect_uris" jsonb NOT NULL, "post_logout_redirect_uris" jsonb, "backchannel_logout_uri" text, "backchannel_logout_session_required" boolean, "token_endpoint_auth_method" text, "application_type" text, "jwks" text, "jwks_uri" text, "grant_types" jsonb, "response_types" jsonb, "require_pkce" boolean, "dpop_bound_access_tokens" boolean, "reference_id" text, "metadata" jsonb, CONSTRAINT "oauth_clients_client_id_key" UNIQUE (client_id), CONSTRAINT "oauth_clients_pkey" PRIMARY KEY (id));

ALTER TABLE "better_auth"."oauth_clients" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_consents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "client_id" text NOT NULL, "user_id" uuid, "reference_id" text, "resources" jsonb, "requested_user_info_claims" jsonb, "scopes" jsonb NOT NULL, "created_at" timestamp with time zone NOT NULL, "updated_at" timestamp with time zone NOT NULL, CONSTRAINT "oauth_consents_pkey" PRIMARY KEY (id));

ALTER TABLE "better_auth"."oauth_consents" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "token" text NOT NULL, "client_id" text NOT NULL, "session_id" uuid, "user_id" uuid NOT NULL, "reference_id" text, "authorization_code_id" text, "resources" jsonb, "requested_user_info_claims" jsonb, "expires_at" timestamp with time zone NOT NULL, "created_at" timestamp with time zone NOT NULL, "revoked" timestamp with time zone, "rotated_at" timestamp with time zone, "rotation_replay_response" text, "rotation_replay_expires_at" timestamp with time zone, "auth_time" timestamp with time zone, "confirmation" jsonb, "scopes" jsonb NOT NULL, CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY (id), CONSTRAINT "oauth_refresh_tokens_token_key" UNIQUE (token));

ALTER TABLE "better_auth"."oauth_refresh_tokens" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "better_auth"."oauth_resources" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "identifier" text NOT NULL, "name" text NOT NULL, "access_token_ttl" integer, "refresh_token_ttl" integer, "signing_algorithm" text, "signing_key_id" text, "allowed_scopes" jsonb, "custom_claims" jsonb, "dpop_bound_access_tokens_required" boolean, "disabled" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "policy_version" integer, "metadata" jsonb, CONSTRAINT "oauth_resources_identifier_key" UNIQUE (identifier), CONSTRAINT "oauth_resources_pkey" PRIMARY KEY (id));

ALTER TABLE "better_auth"."oauth_resources" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "better_auth"."oauth_access_tokens" DROP CONSTRAINT IF EXISTS "oauth_access_tokens_session_id_fkey";
ALTER TABLE "better_auth"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_session_id_fkey" FOREIGN KEY (session_id) REFERENCES better_auth.sessions(id) ON DELETE SET NULL;

ALTER TABLE "better_auth"."oauth_access_tokens" DROP CONSTRAINT IF EXISTS "oauth_access_tokens_user_id_fkey";
ALTER TABLE "better_auth"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_access_tokens" DROP CONSTRAINT IF EXISTS "oauth_access_tokens_client_id_fkey";
ALTER TABLE "better_auth"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_client_id_fkey" FOREIGN KEY (client_id) REFERENCES better_auth.oauth_clients(client_id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_client_resources" DROP CONSTRAINT IF EXISTS "oauth_client_resources_client_id_fkey";
ALTER TABLE "better_auth"."oauth_client_resources" ADD CONSTRAINT "oauth_client_resources_client_id_fkey" FOREIGN KEY (client_id) REFERENCES better_auth.oauth_clients(client_id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_clients" DROP CONSTRAINT IF EXISTS "oauth_clients_user_id_fkey";
ALTER TABLE "better_auth"."oauth_clients" ADD CONSTRAINT "oauth_clients_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_consents" DROP CONSTRAINT IF EXISTS "oauth_consents_client_id_fkey";
ALTER TABLE "better_auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY (client_id) REFERENCES better_auth.oauth_clients(client_id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_consents" DROP CONSTRAINT IF EXISTS "oauth_consents_user_id_fkey";
ALTER TABLE "better_auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_refresh_tokens" DROP CONSTRAINT IF EXISTS "oauth_refresh_tokens_client_id_fkey";
ALTER TABLE "better_auth"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_client_id_fkey" FOREIGN KEY (client_id) REFERENCES better_auth.oauth_clients(client_id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_access_tokens" DROP CONSTRAINT IF EXISTS "oauth_access_tokens_refresh_id_fkey";
ALTER TABLE "better_auth"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_refresh_id_fkey" FOREIGN KEY (refresh_id) REFERENCES better_auth.oauth_refresh_tokens(id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_refresh_tokens" DROP CONSTRAINT IF EXISTS "oauth_refresh_tokens_session_id_fkey";
ALTER TABLE "better_auth"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_session_id_fkey" FOREIGN KEY (session_id) REFERENCES better_auth.sessions(id) ON DELETE SET NULL;

ALTER TABLE "better_auth"."oauth_refresh_tokens" DROP CONSTRAINT IF EXISTS "oauth_refresh_tokens_user_id_fkey";
ALTER TABLE "better_auth"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE;

ALTER TABLE "better_auth"."oauth_client_resources" DROP CONSTRAINT IF EXISTS "oauth_client_resources_resource_id_fkey";
ALTER TABLE "better_auth"."oauth_client_resources" ADD CONSTRAINT "oauth_client_resources_resource_id_fkey" FOREIGN KEY (resource_id) REFERENCES better_auth.oauth_resources(identifier) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS oauth_access_tokens_authorization_code_id_idx ON better_auth.oauth_access_tokens USING btree (authorization_code_id);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_client_id_idx ON better_auth.oauth_access_tokens USING btree (client_id);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_refresh_id_idx ON better_auth.oauth_access_tokens USING btree (refresh_id);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_session_id_idx ON better_auth.oauth_access_tokens USING btree (session_id);

CREATE INDEX IF NOT EXISTS oauth_access_tokens_user_id_idx ON better_auth.oauth_access_tokens USING btree (user_id);

CREATE INDEX IF NOT EXISTS oauth_client_resources_resource_id_idx ON better_auth.oauth_client_resources USING btree (resource_id);

CREATE INDEX IF NOT EXISTS oauth_clients_user_id_idx ON better_auth.oauth_clients USING btree (user_id);

CREATE INDEX IF NOT EXISTS oauth_consents_client_id_idx ON better_auth.oauth_consents USING btree (client_id);

CREATE INDEX IF NOT EXISTS oauth_consents_user_id_idx ON better_auth.oauth_consents USING btree (user_id);

CREATE INDEX IF NOT EXISTS oauth_refresh_tokens_authorization_code_id_idx ON better_auth.oauth_refresh_tokens USING btree (authorization_code_id);

CREATE INDEX IF NOT EXISTS oauth_refresh_tokens_client_id_idx ON better_auth.oauth_refresh_tokens USING btree (client_id);

CREATE INDEX IF NOT EXISTS oauth_refresh_tokens_session_id_idx ON better_auth.oauth_refresh_tokens USING btree (session_id);

CREATE INDEX IF NOT EXISTS oauth_refresh_tokens_user_id_idx ON better_auth.oauth_refresh_tokens USING btree (user_id);
