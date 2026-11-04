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
