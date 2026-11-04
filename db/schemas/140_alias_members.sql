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
