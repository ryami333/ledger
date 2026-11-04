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
