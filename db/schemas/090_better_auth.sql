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
