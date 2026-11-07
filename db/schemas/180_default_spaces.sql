-- The default space of a user (PLAN.md, D17). The MCP tools use it when the
-- user names no space. A user has zero or one default space. The trigger
-- default_spaces_set_user_id sets user_id from the JWT. A delete of the space
-- or the user deletes the row.
CREATE TABLE IF NOT EXISTS "public"."default_spaces" (
    "user_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "default_spaces_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "default_spaces_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE,
    CONSTRAINT "default_spaces_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."default_spaces" ENABLE ROW LEVEL SECURITY;

-- The delete of a space finds its rows with this index.
CREATE INDEX IF NOT EXISTS "default_spaces_space_id_idx" ON "public"."default_spaces" USING "btree" ("space_id");
