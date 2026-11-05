-- A party is one member or one alias on one side of a transaction (PLAN.md,
-- D6 and D7). The table stores the alias, not its members. The composite
-- foreign keys keep the party in the space of its transaction.
--
-- share_minor is the custom share of the party, in minor units of the
-- transaction currency (PLAN.md, D6). It is null for an equal split. On one
-- side, each party has a share or no party has a share, and the shares sum to
-- the amount of the transaction. The constraint trigger
-- transaction_parties_check_sides (600_triggers.sql) makes sure of this.
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
    "share_minor" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transaction_parties_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "transaction_parties_member_or_alias_check" CHECK ("num_nonnulls"("member_id", "alias_id") = 1),
    CONSTRAINT "transaction_parties_share_minor_check" CHECK ("share_minor" > 0),
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
