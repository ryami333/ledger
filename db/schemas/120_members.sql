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
