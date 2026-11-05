-- A transaction is one payment: a date, an amount in one currency, the payers,
-- and the parties that the payment is for (PLAN.md, glossary). The parties are
-- in transaction_parties.
-- Each side has one or more parties. The constraint trigger
-- transactions_check_sides (600_triggers.sql) makes sure of this.
--
-- amount_minor is the amount in minor units of the currency (PLAN.md, D4).
-- rate is the value of one unit of the currency in the default currency, at
-- the save of the transaction (PLAN.md, D5). A later change of the space
-- currency does not change it. A transaction in the default currency has the
-- rate 1. Select it as text (rate::text), because a JSON number can lose
-- digits.
-- transaction_date is a date with no time and no time zone (PLAN.md, D11).
CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "amount_minor" bigint NOT NULL,
    "currency" "text" NOT NULL,
    "rate" numeric(18, 8) NOT NULL,
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
    CONSTRAINT "transactions_rate_check" CHECK ("rate" > 0),
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
