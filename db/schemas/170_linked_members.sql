-- The linked member of a user in a space: the member that the user is
-- (PLAN.md, D16). The MCP server reads it for "me" (D15).
--
-- A user has zero or one linked member in each space, and a member is the
-- linked member of zero or one user. The trigger linked_members_set_user_id
-- sets user_id from the JWT. A delete of the member, the space, or the user
-- deletes the row.
CREATE TABLE IF NOT EXISTS "public"."linked_members" (
    "space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "linked_members_pkey" PRIMARY KEY ("space_id", "user_id"),
    CONSTRAINT "linked_members_space_id_member_id_key" UNIQUE ("space_id", "member_id"),
    CONSTRAINT "linked_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE,
    CONSTRAINT "linked_members_member_fkey" FOREIGN KEY ("space_id", "member_id") REFERENCES "public"."members"("space_id", "id") ON DELETE CASCADE,
    CONSTRAINT "linked_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."linked_members" ENABLE ROW LEVEL SECURITY;

-- The delete of a user finds its rows with this index.
CREATE INDEX IF NOT EXISTS "linked_members_user_id_idx" ON "public"."linked_members" USING "btree" ("user_id");
