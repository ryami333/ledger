-- ----------------------------------------------------------------------------
-- 0001_baseline.sql
--
-- The first migration of a new database: the PostgREST roles, the schema
-- better_auth, and the schema public with its tables, functions, triggers,
-- policies, and grants (PLAN.md, Phase 1).
--
-- The statements are the files of db/schemas, in their order. `yarn db:diff`
-- finds no change after this migration.
--
-- Rollback: drop the database and make it again.
-- ----------------------------------------------------------------------------


-- schemas/000_roles.sql

-- The roles of PostgREST. PostgREST connects as authenticator and then
-- changes to the role of the JWT: anon or authenticated. ledger has no worker,
-- thus it has no service_role.
--
-- A role belongs to the cluster, not to one database. Thus each statement
-- checks first. The migration script gives authenticator the password of
-- DATABASE_URL after each run (src/scripts/migrateDatabase.ts).
--
-- gen_random_uuid() is part of Postgres, thus the schema needs no extension.
do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'anon') then
    create role "anon" nologin noinherit;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role "authenticated" nologin noinherit;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'authenticator') then
    create role "authenticator" login noinherit;
  end if;
end
$$;

grant "anon", "authenticated" to "authenticator";


-- schemas/050_types.sql

-- The side of a party in a transaction (PLAN.md, glossary): paid_by holds the
-- payers, and paid_to holds the payees, who got the value.
do $$
begin
  create type "public"."transaction_side" as enum ('paid_by', 'paid_to');
exception
  when duplicate_object then null;
end
$$;


-- schemas/090_better_auth.sql

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


-- schemas/100_spaces.sql

-- One space is a group of members with a shared ledger, for example one trip
-- or one household (PLAN.md, glossary). create_space inserts a space with its
-- default currency and its first members.
CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "spaces_title_check" CHECK ("btrim"("title") <> ''),
    -- A user who leaves keeps their spaces, with no name.
    CONSTRAINT "spaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "better_auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "spaces_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "better_auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;


-- schemas/110_space_currencies.sql

-- The currencies that the transactions of one space can use, with their rates
-- (PLAN.md, D5). Exactly one row of each space is the default currency, with
-- the rate 1. The constraint trigger space_currencies_check_default
-- (600_triggers.sql) makes sure that each space has one.
--
-- A rate is the value of one unit of the currency in the default currency.
-- Select it as text (rate::text), because a JSON number can lose digits.
CREATE TABLE IF NOT EXISTS "public"."space_currencies" (
    "space_id" "uuid" NOT NULL,
    "currency" "text" NOT NULL,
    "rate" numeric(18, 8) NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "space_currencies_pkey" PRIMARY KEY ("space_id", "currency"),
    CONSTRAINT "space_currencies_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
    CONSTRAINT "space_currencies_rate_check" CHECK ("rate" > 0),
    CONSTRAINT "space_currencies_default_rate_check" CHECK ((NOT "is_default") OR ("rate" = 1)),
    CONSTRAINT "space_currencies_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."space_currencies" ENABLE ROW LEVEL SECURITY;

-- At most one default currency for each space.
CREATE UNIQUE INDEX IF NOT EXISTS "space_currencies_one_default_idx" ON "public"."space_currencies" USING "btree" ("space_id") WHERE "is_default";


-- schemas/120_members.sql

-- A member is a name in one space, for example "Barack" (PLAN.md, D8). A
-- member has no account and no link to a user. An archived member does not
-- show in the party picker of a new transaction.
CREATE TABLE IF NOT EXISTS "public"."members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "archived_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "members_pkey" PRIMARY KEY ("id"),
    -- The target of the composite foreign keys of alias_members and
    -- transaction_parties. They keep a member in the space of its row.
    CONSTRAINT "members_space_id_id_key" UNIQUE ("space_id", "id"),
    CONSTRAINT "members_name_check" CHECK ("btrim"("name") <> ''),
    CONSTRAINT "members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;

-- The name of a member is unique in its space, with no regard to case.
CREATE UNIQUE INDEX IF NOT EXISTS "members_space_id_name_idx" ON "public"."members" USING "btree" ("space_id", "lower"("name"));


-- schemas/130_aliases.sql

-- An alias is a name for a set of members of one space, for example "Obamas'
-- Shared Account" (PLAN.md, D7). An alias has one or more members
-- (alias_members). The constraint trigger aliases_check_members
-- (600_triggers.sql) makes sure of this.
CREATE TABLE IF NOT EXISTS "public"."aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "aliases_pkey" PRIMARY KEY ("id"),
    -- The target of the composite foreign keys of alias_members and
    -- transaction_parties.
    CONSTRAINT "aliases_space_id_id_key" UNIQUE ("space_id", "id"),
    CONSTRAINT "aliases_name_check" CHECK ("btrim"("name") <> ''),
    CONSTRAINT "aliases_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."aliases" ENABLE ROW LEVEL SECURITY;

-- The name of an alias is unique in its space, with no regard to case.
CREATE UNIQUE INDEX IF NOT EXISTS "aliases_space_id_name_idx" ON "public"."aliases" USING "btree" ("space_id", "lower"("name"));


-- schemas/140_alias_members.sql

-- The members of an alias. The composite foreign keys keep the alias and the
-- member in one space.
--
-- A delete of an alias deletes its rows here. A member in an alias cannot be
-- deleted (PLAN.md, D8). The key on the member has no ON DELETE action, thus
-- Postgres checks it at the end of the statement. A delete of the space then
-- removes all rows with no error.
CREATE TABLE IF NOT EXISTS "public"."alias_members" (
    "alias_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "alias_members_pkey" PRIMARY KEY ("alias_id", "member_id"),
    CONSTRAINT "alias_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE,
    CONSTRAINT "alias_members_alias_fkey" FOREIGN KEY ("space_id", "alias_id") REFERENCES "public"."aliases"("space_id", "id") ON DELETE CASCADE,
    CONSTRAINT "alias_members_member_fkey" FOREIGN KEY ("space_id", "member_id") REFERENCES "public"."members"("space_id", "id")
);

ALTER TABLE "public"."alias_members" ENABLE ROW LEVEL SECURITY;

-- The primary key starts with alias_id. The foreign key on the member and the
-- delete check of a member need this index.
CREATE INDEX IF NOT EXISTS "alias_members_space_id_member_id_idx" ON "public"."alias_members" USING "btree" ("space_id", "member_id");


-- schemas/150_transactions.sql

-- A transaction is one payment: a date, an amount in one currency, the payers,
-- and the payees (PLAN.md, glossary). The parties are in transaction_parties.
-- Each side has one or more parties. The constraint trigger
-- transactions_check_sides (600_triggers.sql) makes sure of this.
--
-- amount_minor is the amount in minor units of the currency (PLAN.md, D4).
-- transaction_date is a date with no time and no time zone (PLAN.md, D11).
CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "amount_minor" bigint NOT NULL,
    "currency" "text" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id"),
    -- The target of the composite foreign key of transaction_parties.
    CONSTRAINT "transactions_space_id_id_key" UNIQUE ("space_id", "id"),
    CONSTRAINT "transactions_title_check" CHECK ("btrim"("title") <> ''),
    CONSTRAINT "transactions_amount_minor_check" CHECK ("amount_minor" > 0),
    CONSTRAINT "transactions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE,
    -- A transaction uses only a currency of its space. A space currency in use
    -- cannot be removed (PLAN.md, D5). With no ON DELETE action, Postgres
    -- checks the key at the end of the statement, thus a delete of the space
    -- removes all rows with no error.
    CONSTRAINT "transactions_currency_fkey" FOREIGN KEY ("space_id", "currency") REFERENCES "public"."space_currencies"("space_id", "currency"),
    CONSTRAINT "transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "better_auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "transactions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "better_auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;

-- The order of the transaction list (PLAN.md, D11).
CREATE INDEX IF NOT EXISTS "transactions_space_id_date_idx" ON "public"."transactions" USING "btree" ("space_id", "transaction_date" DESC, "created_at" DESC);


-- schemas/160_transaction_parties.sql

-- A party is one member or one alias on one side of a transaction (PLAN.md,
-- D6 and D7). The table stores the alias, not its members. The composite
-- foreign keys keep the party in the space of its transaction.
--
-- A member or an alias in use cannot be deleted. These keys have no ON DELETE
-- action, thus Postgres checks them at the end of the statement. A delete of
-- the space then removes all rows with no error.
CREATE TABLE IF NOT EXISTS "public"."transaction_parties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "side" "public"."transaction_side" NOT NULL,
    "member_id" "uuid",
    "alias_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transaction_parties_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transaction_parties_member_or_alias_check" CHECK ("num_nonnulls"("member_id", "alias_id") = 1),
    CONSTRAINT "transaction_parties_member_key" UNIQUE ("transaction_id", "side", "member_id"),
    CONSTRAINT "transaction_parties_alias_key" UNIQUE ("transaction_id", "side", "alias_id"),
    CONSTRAINT "transaction_parties_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE,
    CONSTRAINT "transaction_parties_transaction_fkey" FOREIGN KEY ("space_id", "transaction_id") REFERENCES "public"."transactions"("space_id", "id") ON DELETE CASCADE,
    CONSTRAINT "transaction_parties_member_fkey" FOREIGN KEY ("space_id", "member_id") REFERENCES "public"."members"("space_id", "id"),
    CONSTRAINT "transaction_parties_alias_fkey" FOREIGN KEY ("space_id", "alias_id") REFERENCES "public"."aliases"("space_id", "id")
);

ALTER TABLE "public"."transaction_parties" ENABLE ROW LEVEL SECURITY;

-- The delete checks of a member and of an alias need these indexes.
CREATE INDEX IF NOT EXISTS "transaction_parties_member_idx" ON "public"."transaction_parties" USING "btree" ("space_id", "member_id") WHERE ("member_id" IS NOT NULL);
CREATE INDEX IF NOT EXISTS "transaction_parties_alias_idx" ON "public"."transaction_parties" USING "btree" ("space_id", "alias_id") WHERE ("alias_id" IS NOT NULL);


-- schemas/190_app_users.sql

-- The names and the images of the users, for the UI (PLAN.md, D3). PostgREST
-- cannot read the schema better_auth. This view runs as its owner, thus it
-- reads better_auth.users with no grant on that schema. It shows no email.
--
-- It is the only view without security_invoker. rls_enabled.test.sql knows
-- this exception.
CREATE OR REPLACE VIEW "public"."app_users" AS
 SELECT "users"."id",
    "users"."name",
    "users"."image"
   FROM "better_auth"."users";


-- schemas/500_functions.sql

-- Returns the ID of the current user: the claim sub of the JWT that the web
-- app signs for PostgREST (PLAN.md, D3). It returns null for no JWT, or for a
-- JWT with no sub.
CREATE OR REPLACE FUNCTION "public"."current_user_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

-- Sets created_at on INSERT and keeps it on UPDATE. The column default applies
-- only when the client sends no value. Thus no caller can send or change
-- created_at.
CREATE OR REPLACE FUNCTION "public"."set_created_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;

  return new;
end;
$$;

-- Sets updated_at on INSERT and on UPDATE.
CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Sets a "created by" column, for example created_by, to the current user on
-- INSERT. An UPDATE keeps the old value. The trigger gives the column name as
-- its argument.
--
-- Only a request of the role authenticated gets the current user. A direct
-- database connection (the seed, a migration) keeps the value that it sends.
CREATE OR REPLACE FUNCTION "public"."set_actor_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_column_name text := tg_argv[0];
begin
  -- jsonb_populate_record ignores a key that is not a column. Without this
  -- check, a wrong column name in a trigger does nothing and gives no error.
  if not (to_jsonb(new) ? v_column_name) then
    raise exception 'set_actor_on_insert: table % has no column %',
      tg_table_name, v_column_name
      using errcode = '42703';
  end if;

  -- The column records who created the row. No caller can move it to a
  -- different user. A null must pass, because each actor foreign key uses
  -- ON DELETE SET NULL.
  if tg_op = 'UPDATE' then
    if (to_jsonb(new) -> v_column_name) = 'null'::jsonb then
      return new;
    end if;

    return pg_catalog.jsonb_populate_record(
      new,
      pg_catalog.jsonb_build_object(v_column_name, to_jsonb(old) -> v_column_name)
    );
  end if;

  if current_user = 'authenticated' then
    return pg_catalog.jsonb_populate_record(
      new,
      pg_catalog.jsonb_build_object(v_column_name, public.current_user_id())
    );
  end if;

  return new;
end;
$$;

-- Sets an "updated by" column, for example updated_by, to the current user on
-- INSERT and on UPDATE. The trigger gives the column name as its argument.
--
-- Only a request of the role authenticated gets the current user. A direct
-- database connection keeps the value that it sends. ON DELETE SET NULL of the
-- actor foreign key runs as the owner, thus it also keeps its null.
CREATE OR REPLACE FUNCTION "public"."set_actor_on_write"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_column_name text := tg_argv[0];
begin
  if not (to_jsonb(new) ? v_column_name) then
    raise exception 'set_actor_on_write: table % has no column %',
      tg_table_name, v_column_name
      using errcode = '42703';
  end if;

  if current_user = 'authenticated' then
    return pg_catalog.jsonb_populate_record(
      new,
      pg_catalog.jsonb_build_object(v_column_name, public.current_user_id())
    );
  end if;

  return new;
end;
$$;

-- Makes sure that the space of the row has exactly one default currency. The
-- deferred constraint triggers space_currencies_check_default and
-- spaces_check_default_currency call it at the end of the database
-- transaction. Thus save_space_currencies can change the default currency in
-- more than one statement.
CREATE OR REPLACE FUNCTION "public"."check_space_default_currency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_space_id uuid;
  v_default_count integer;
begin
  if tg_table_name = 'spaces' then
    v_space_id := new.id;
  elsif tg_op = 'DELETE' then
    v_space_id := old.space_id;
  else
    v_space_id := new.space_id;
  end if;

  -- A delete of the space also deletes its currencies.
  if not exists (select from public.spaces where spaces.id = v_space_id) then
    return null;
  end if;

  select count(*) into v_default_count
  from public.space_currencies
  where space_currencies.space_id = v_space_id
    and space_currencies.is_default;

  if v_default_count <> 1 then
    raise exception 'The space % must have exactly one default currency', v_space_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- Makes sure that the alias of the row has one or more members (PLAN.md, D7).
-- The deferred constraint triggers call it at the end of the database
-- transaction. Thus save_alias can replace the members.
CREATE OR REPLACE FUNCTION "public"."check_alias_members"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_alias_id uuid;
begin
  if tg_table_name = 'aliases' then
    v_alias_id := new.id;
  elsif tg_op = 'DELETE' then
    v_alias_id := old.alias_id;
  else
    v_alias_id := new.alias_id;
  end if;

  -- A delete of the alias also deletes its members.
  if not exists (select from public.aliases where aliases.id = v_alias_id) then
    return null;
  end if;

  if not exists (
    select from public.alias_members where alias_members.alias_id = v_alias_id
  ) then
    raise exception 'The alias % must have one or more members', v_alias_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- Makes sure that each side of the transaction of the row has one or more
-- parties. The deferred constraint triggers call it at the end of the database
-- transaction. Thus save_transaction can replace the parties.
CREATE OR REPLACE FUNCTION "public"."check_transaction_sides"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_transaction_id uuid;
begin
  if tg_table_name = 'transactions' then
    v_transaction_id := new.id;
  elsif tg_op = 'DELETE' then
    v_transaction_id := old.transaction_id;
  else
    v_transaction_id := new.transaction_id;
  end if;

  -- A delete of the transaction also deletes its parties.
  if not exists (
    select from public.transactions where transactions.id = v_transaction_id
  ) then
    return null;
  end if;

  if (
    select count(distinct transaction_parties.side)
    from public.transaction_parties
    where transaction_parties.transaction_id = v_transaction_id
  ) <> 2 then
    raise exception 'The transaction % must have one or more parties on each side', v_transaction_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- Inserts a space, its default currency with the rate 1, and its first
-- members (PLAN.md, D9). Returns the ID of the space.
CREATE OR REPLACE FUNCTION "public"."create_space"("p_title" "text", "p_description" "text", "p_default_currency" "text", "p_member_names" "text"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_space_id uuid;
begin
  insert into public.spaces (title, description)
  values (p_title, p_description)
  returning id into v_space_id;

  insert into public.space_currencies (space_id, currency, rate, is_default)
  values (v_space_id, p_default_currency, 1, true);

  insert into public.members (space_id, name)
  select v_space_id, member_name
  from unnest(coalesce(p_member_names, '{}')) as member_name;

  return v_space_id;
end;
$$;

-- Replaces the currencies of a space (PLAN.md, D5). p_currencies is a jsonb
-- array of { "currency": "USD", "rate": "0.92", "is_default": false }. Give
-- the rate as a string, so it keeps all its digits. Returns the ID of the
-- space.
--
-- It refuses a list with no default currency, or with more than one. It
-- removes the currencies that are not in the list. A currency in use cannot
-- be removed: the foreign key of transactions refuses the delete.
CREATE OR REPLACE FUNCTION "public"."save_space_currencies"("p_space_id" "uuid", "p_currencies" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_default_count integer;
begin
  if pg_catalog.jsonb_typeof(p_currencies) is distinct from 'array' then
    raise exception 'save_space_currencies needs a jsonb array'
      using errcode = '22023';
  end if;

  select count(*) into v_default_count
  from pg_catalog.jsonb_array_elements(p_currencies) as item
  where (item ->> 'is_default')::boolean;

  if v_default_count <> 1 then
    raise exception 'save_space_currencies needs exactly one default currency'
      using errcode = '22023';
  end if;

  if not exists (select from public.spaces where spaces.id = p_space_id) then
    raise exception 'The space % does not exist', p_space_id
      using errcode = 'P0002';
  end if;

  delete from public.space_currencies
  where space_currencies.space_id = p_space_id
    and space_currencies.currency not in (
      select item ->> 'currency'
      from pg_catalog.jsonb_array_elements(p_currencies) as item
    );

  -- Clear the old default first. The unique index allows only one default
  -- currency for each space at each moment.
  update public.space_currencies
  set is_default = false
  where space_currencies.space_id = p_space_id
    and space_currencies.is_default;

  insert into public.space_currencies (space_id, currency, rate, is_default)
  select
    p_space_id,
    item ->> 'currency',
    (item ->> 'rate')::numeric(18, 8),
    (item ->> 'is_default')::boolean
  from pg_catalog.jsonb_array_elements(p_currencies) as item
  on conflict (space_id, currency) do update
  set rate = excluded.rate,
      is_default = excluded.is_default;

  return p_space_id;
end;
$$;

-- Inserts or updates an alias, and replaces its members (PLAN.md, D9). Give
-- null as p_alias_id for a new alias. Returns the ID of the alias. The
-- composite foreign keys refuse a member of a different space.
CREATE OR REPLACE FUNCTION "public"."save_alias"("p_alias_id" "uuid", "p_space_id" "uuid", "p_name" "text", "p_member_ids" "uuid"[]) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_alias_id uuid;
begin
  if coalesce(pg_catalog.cardinality(p_member_ids), 0) = 0 then
    raise exception 'save_alias needs one or more members'
      using errcode = '22023';
  end if;

  if p_alias_id is null then
    insert into public.aliases (space_id, name)
    values (p_space_id, p_name)
    returning id into v_alias_id;
  else
    update public.aliases
    set name = p_name
    where aliases.id = p_alias_id
      and aliases.space_id = p_space_id
    returning id into v_alias_id;

    if v_alias_id is null then
      raise exception 'The alias % does not exist in the space %', p_alias_id, p_space_id
        using errcode = 'P0002';
    end if;
  end if;

  delete from public.alias_members
  where alias_members.alias_id = v_alias_id
    and alias_members.member_id <> all (p_member_ids);

  insert into public.alias_members (alias_id, member_id, space_id)
  select distinct v_alias_id, member_id, p_space_id
  from unnest(p_member_ids) as member_id
  on conflict (alias_id, member_id) do nothing;

  return v_alias_id;
end;
$$;

-- Inserts or updates a transaction, and replaces its parties (PLAN.md, D9).
-- Give null as p_transaction_id for a new transaction. p_paid_by and
-- p_paid_to are jsonb arrays of { "member_id": ... } or { "alias_id": ... }.
-- Returns the ID of the transaction.
--
-- It refuses an empty side, and an archived member in a new transaction. The
-- composite foreign keys refuse a party of a different space and a currency
-- that is not a space currency.
CREATE OR REPLACE FUNCTION "public"."save_transaction"("p_transaction_id" "uuid", "p_space_id" "uuid", "p_title" "text", "p_description" "text", "p_amount_minor" bigint, "p_currency" "text", "p_transaction_date" "date", "p_paid_by" "jsonb", "p_paid_to" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY INVOKER
    SET "search_path" TO ''
    AS $$
declare
  v_transaction_id uuid;
begin
  if pg_catalog.jsonb_typeof(p_paid_by) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_paid_by) = 0
    or pg_catalog.jsonb_typeof(p_paid_to) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_paid_to) = 0
  then
    raise exception 'save_transaction needs one or more parties on each side'
      using errcode = '22023';
  end if;

  if p_transaction_id is null and exists (
    select
    from pg_catalog.jsonb_array_elements(p_paid_by || p_paid_to) as item
    join public.members on members.id = (item ->> 'member_id')::uuid
    where members.archived_at is not null
  ) then
    raise exception 'save_transaction refuses an archived member in a new transaction'
      using errcode = '22023';
  end if;

  if p_transaction_id is null then
    insert into public.transactions (space_id, title, description, amount_minor, currency, transaction_date)
    values (p_space_id, p_title, p_description, p_amount_minor, p_currency, p_transaction_date)
    returning id into v_transaction_id;
  else
    update public.transactions
    set title = p_title,
        description = p_description,
        amount_minor = p_amount_minor,
        currency = p_currency,
        transaction_date = p_transaction_date
    where transactions.id = p_transaction_id
      and transactions.space_id = p_space_id
    returning id into v_transaction_id;

    if v_transaction_id is null then
      raise exception 'The transaction % does not exist in the space %', p_transaction_id, p_space_id
        using errcode = 'P0002';
    end if;

    delete from public.transaction_parties
    where transaction_parties.transaction_id = v_transaction_id;
  end if;

  insert into public.transaction_parties (transaction_id, space_id, side, member_id, alias_id)
  select
    v_transaction_id,
    p_space_id,
    parties.side,
    (parties.item ->> 'member_id')::uuid,
    (parties.item ->> 'alias_id')::uuid
  from (
    select 'paid_by'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_by) as item
    union all
    select 'paid_to'::public.transaction_side as side, item
    from pg_catalog.jsonb_array_elements(p_paid_to) as item
  ) as parties;

  return v_transaction_id;
end;
$$;


-- schemas/600_triggers.sql

-- Each table runs set_created_at and set_updated_at before INSERT and UPDATE.
-- db/tests/database/timestamp_columns.test.sql finds a table with no trigger.

CREATE OR REPLACE TRIGGER "spaces_set_created_at" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "spaces_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "space_currencies_set_created_at" BEFORE INSERT OR UPDATE ON "public"."space_currencies" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "space_currencies_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."space_currencies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "members_set_created_at" BEFORE INSERT OR UPDATE ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "members_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "aliases_set_created_at" BEFORE INSERT OR UPDATE ON "public"."aliases" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "aliases_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."aliases" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "alias_members_set_created_at" BEFORE INSERT OR UPDATE ON "public"."alias_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "alias_members_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."alias_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "transactions_set_created_at" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "transactions_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "transaction_parties_set_created_at" BEFORE INSERT OR UPDATE ON "public"."transaction_parties" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "transaction_parties_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."transaction_parties" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- The actor columns (PLAN.md, D3). db/tests/database/actor_columns.test.sql
-- checks each trigger.

CREATE OR REPLACE TRIGGER "spaces_set_created_by" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_insert"('created_by');
CREATE OR REPLACE TRIGGER "spaces_set_updated_by" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_write"('updated_by');

CREATE OR REPLACE TRIGGER "transactions_set_created_by" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_insert"('created_by');
CREATE OR REPLACE TRIGGER "transactions_set_updated_by" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_write"('updated_by');

-- The deferred constraint triggers check the rules that need more than one
-- row, at the end of the database transaction. Thus a function of PLAN.md, D9
-- can replace the rows of a list in more than one statement.

-- Each space has exactly one default currency (PLAN.md, D5).
CREATE CONSTRAINT TRIGGER "spaces_check_default_currency" AFTER INSERT ON "public"."spaces" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_space_default_currency"();
CREATE CONSTRAINT TRIGGER "space_currencies_check_default" AFTER INSERT OR DELETE OR UPDATE ON "public"."space_currencies" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_space_default_currency"();

-- Each alias has one or more members (PLAN.md, D7).
CREATE CONSTRAINT TRIGGER "aliases_check_members" AFTER INSERT ON "public"."aliases" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_alias_members"();
CREATE CONSTRAINT TRIGGER "alias_members_check_members" AFTER DELETE OR UPDATE ON "public"."alias_members" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_alias_members"();

-- Each side of a transaction has one or more parties.
CREATE CONSTRAINT TRIGGER "transactions_check_sides" AFTER INSERT ON "public"."transactions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_transaction_sides"();
CREATE CONSTRAINT TRIGGER "transaction_parties_check_sides" AFTER DELETE OR UPDATE ON "public"."transaction_parties" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_transaction_sides"();


-- schemas/700_policies.sql

-- The RLS policies (PLAN.md, D3). Each user can read and change all spaces.
-- Thus each policy allows its action to the role authenticated, with no row
-- condition. The grants (800_grants.sql) select the columns. The role anon
-- has no grant, thus it has no policy here.
--
-- RLS stays on, so that a later rule ("a user sees only some spaces") needs
-- only new policies.

-- spaces

CREATE POLICY "spaces_select_authenticated" ON "public"."spaces" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "spaces_insert_authenticated" ON "public"."spaces" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "spaces_update_authenticated" ON "public"."spaces" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "spaces_delete_authenticated" ON "public"."spaces" FOR DELETE TO "authenticated" USING (true);

-- space_currencies

CREATE POLICY "space_currencies_select_authenticated" ON "public"."space_currencies" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "space_currencies_insert_authenticated" ON "public"."space_currencies" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "space_currencies_update_authenticated" ON "public"."space_currencies" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "space_currencies_delete_authenticated" ON "public"."space_currencies" FOR DELETE TO "authenticated" USING (true);

-- members

CREATE POLICY "members_select_authenticated" ON "public"."members" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "members_insert_authenticated" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "members_update_authenticated" ON "public"."members" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "members_delete_authenticated" ON "public"."members" FOR DELETE TO "authenticated" USING (true);

-- aliases

CREATE POLICY "aliases_select_authenticated" ON "public"."aliases" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "aliases_insert_authenticated" ON "public"."aliases" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "aliases_update_authenticated" ON "public"."aliases" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "aliases_delete_authenticated" ON "public"."aliases" FOR DELETE TO "authenticated" USING (true);

-- alias_members

CREATE POLICY "alias_members_select_authenticated" ON "public"."alias_members" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "alias_members_insert_authenticated" ON "public"."alias_members" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "alias_members_delete_authenticated" ON "public"."alias_members" FOR DELETE TO "authenticated" USING (true);

-- transactions

CREATE POLICY "transactions_select_authenticated" ON "public"."transactions" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "transactions_insert_authenticated" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "transactions_update_authenticated" ON "public"."transactions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "transactions_delete_authenticated" ON "public"."transactions" FOR DELETE TO "authenticated" USING (true);

-- transaction_parties

CREATE POLICY "transaction_parties_select_authenticated" ON "public"."transaction_parties" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "transaction_parties_insert_authenticated" ON "public"."transaction_parties" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "transaction_parties_delete_authenticated" ON "public"."transaction_parties" FOR DELETE TO "authenticated" USING (true);


-- schemas/800_grants.sql

-- The grants of the tables and the functions. The RLS policies
-- (700_policies.sql) select the rows. These grants select the roles and the
-- columns.
--
-- Postgres gives EXECUTE on a new function to public. This file removes it,
-- then gives back only what the web app needs. Thus a new table or function
-- needs a grant here. `yarn db:diff` copies the grants and the default
-- privileges into the migration.
--
-- The functions of PLAN.md, D9 run as the caller (SECURITY INVOKER). Thus
-- authenticated has the INSERT and UPDATE grants that these functions use.
-- The deferred constraint triggers (600_triggers.sql) keep the rules of the
-- lists also for a direct write through PostgREST.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;

-- authenticated reads each table and the view app_users.
grant select on all tables in schema public to authenticated;

grant insert ("title", "description") on "public"."spaces" to authenticated;
grant update ("title", "description") on "public"."spaces" to authenticated;
grant delete on "public"."spaces" to authenticated;

grant insert ("space_id", "currency", "rate", "is_default") on "public"."space_currencies" to authenticated;
grant update ("rate", "is_default") on "public"."space_currencies" to authenticated;
grant delete on "public"."space_currencies" to authenticated;

grant insert ("space_id", "name") on "public"."members" to authenticated;
grant update ("name", "archived_at") on "public"."members" to authenticated;
grant delete on "public"."members" to authenticated;

grant insert ("space_id", "name") on "public"."aliases" to authenticated;
grant update ("name") on "public"."aliases" to authenticated;
grant delete on "public"."aliases" to authenticated;

grant insert ("alias_id", "member_id", "space_id") on "public"."alias_members" to authenticated;
grant delete on "public"."alias_members" to authenticated;

grant insert ("space_id", "title", "description", "amount_minor", "currency", "transaction_date") on "public"."transactions" to authenticated;
grant update ("title", "description", "amount_minor", "currency", "transaction_date") on "public"."transactions" to authenticated;
grant delete on "public"."transactions" to authenticated;

grant insert ("transaction_id", "space_id", "side", "member_id", "alias_id") on "public"."transaction_parties" to authenticated;
grant delete on "public"."transaction_parties" to authenticated;

-- better-auth owns the schema better_auth. No PostgREST role reads it. The
-- view app_users reads it as its owner.
revoke all on schema "better_auth" from public, anon, authenticated;

-- Functions. A trigger function needs no EXECUTE grant for the caller.
revoke execute on function "public"."set_created_at"() from public, anon, authenticated;
revoke execute on function "public"."set_updated_at"() from public, anon, authenticated;
revoke execute on function "public"."set_actor_on_insert"() from public, anon, authenticated;
revoke execute on function "public"."set_actor_on_write"() from public, anon, authenticated;
revoke execute on function "public"."check_space_default_currency"() from public, anon, authenticated;
revoke execute on function "public"."check_alias_members"() from public, anon, authenticated;
revoke execute on function "public"."check_transaction_sides"() from public, anon, authenticated;

-- The actor triggers call current_user_id as the role of the request.
revoke execute on function "public"."current_user_id"() from public, anon;
grant execute on function "public"."current_user_id"() to authenticated;

-- The web app calls the functions of PLAN.md, D9 with the user client.
revoke execute on function "public"."create_space"("text", "text", "text", "text"[]) from public, anon;
grant execute on function "public"."create_space"("text", "text", "text", "text"[]) to authenticated;
revoke execute on function "public"."save_space_currencies"("uuid", "jsonb") from public, anon;
grant execute on function "public"."save_space_currencies"("uuid", "jsonb") to authenticated;
revoke execute on function "public"."save_alias"("uuid", "uuid", "text", "uuid"[]) from public, anon;
grant execute on function "public"."save_alias"("uuid", "uuid", "text", "uuid"[]) to authenticated;
revoke execute on function "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "date", "jsonb", "jsonb") from public, anon;
grant execute on function "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "date", "jsonb", "jsonb") to authenticated;
