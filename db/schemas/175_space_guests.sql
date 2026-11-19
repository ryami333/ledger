-- The spaces of a guest (PLAN.md, D20). A guest reads and changes only the
-- spaces in this table. An admin reads and changes all spaces, and needs no
-- row here.
--
-- Only an admin writes the rows: on an invitation, and with "Edit Spaces" on
-- the page /users. set_space_guests replaces the spaces of one guest. A
-- delete of the space or the user deletes the row.
CREATE TABLE IF NOT EXISTS "public"."space_guests" (
    "space_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "space_guests_pkey" PRIMARY KEY ("space_id", "user_id"),
    CONSTRAINT "space_guests_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE,
    CONSTRAINT "space_guests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "better_auth"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."space_guests" ENABLE ROW LEVEL SECURITY;

-- can_access_space and the delete of a user find the rows of a user with
-- this index.
CREATE INDEX IF NOT EXISTS "space_guests_user_id_idx" ON "public"."space_guests" USING "btree" ("user_id");
