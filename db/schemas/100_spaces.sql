-- One space is a group of members with a shared ledger, for example one trip
-- or one household (PLAN.md, glossary). create_space inserts a space with its
-- default currency and its first members.
CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    -- The route identifier of the space: /spaces/<slug>. The user can change it.
    -- set_space_slug gives a new space its ID as slug.
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "spaces_slug_key" UNIQUE ("slug"),
    CONSTRAINT "spaces_slug_check" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND "length"("slug") <= 100),
    CONSTRAINT "spaces_title_check" CHECK ("btrim"("title") <> ''),
    -- A user who leaves keeps their spaces, with no name.
    CONSTRAINT "spaces_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "better_auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "spaces_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "better_auth"."users"("id") ON DELETE SET NULL
);

ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;
