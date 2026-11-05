-- Each table runs set_created_at and set_updated_at before INSERT and UPDATE.
-- db/tests/database/timestamp_columns.test.sql finds a table with no trigger.

CREATE OR REPLACE TRIGGER "spaces_set_created_at" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "spaces_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "space_currencies_set_created_at" BEFORE INSERT OR UPDATE ON "public"."space_currencies" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "space_currencies_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."space_currencies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "members_set_created_at" BEFORE INSERT OR UPDATE ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "members_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "aliases_set_created_at" BEFORE INSERT OR UPDATE ON "public"."aliases" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "aliases_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."aliases" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "alias_members_set_created_at" BEFORE INSERT OR UPDATE ON "public"."alias_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "alias_members_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."alias_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "transactions_set_created_at" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "transactions_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

CREATE OR REPLACE TRIGGER "transaction_parties_set_created_at" BEFORE INSERT OR UPDATE ON "public"."transaction_parties" FOR EACH ROW EXECUTE FUNCTION "public"."set_created_at"();
CREATE OR REPLACE TRIGGER "transaction_parties_set_updated_at" BEFORE INSERT OR UPDATE ON "public"."transaction_parties" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();

-- The actor columns (PLAN.md, D3). db/tests/database/actor_columns.test.sql
-- checks each trigger.

CREATE OR REPLACE TRIGGER "spaces_set_created_by" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_insert"('created_by');
CREATE OR REPLACE TRIGGER "spaces_set_updated_by" BEFORE INSERT OR UPDATE ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_write"('updated_by');

CREATE OR REPLACE TRIGGER "transactions_set_created_by" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_insert"('created_by');
CREATE OR REPLACE TRIGGER "transactions_set_updated_by" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_actor_on_write"('updated_by');

-- The deferred constraint triggers check the rules that need more than one
-- row, at the end of the database transaction. Thus a function of PLAN.md, D9
-- can replace the rows of a list in more than one statement.

-- A new space with no slug gets its ID as slug.
CREATE OR REPLACE TRIGGER "spaces_set_slug" BEFORE INSERT ON "public"."spaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_space_slug"();

-- Each space has exactly one default currency (PLAN.md, D5).
CREATE CONSTRAINT TRIGGER "spaces_check_default_currency" AFTER INSERT ON "public"."spaces" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_space_default_currency"();
CREATE CONSTRAINT TRIGGER "space_currencies_check_default" AFTER INSERT OR DELETE OR UPDATE ON "public"."space_currencies" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_space_default_currency"();

-- Each alias has one or more members (PLAN.md, D7).
CREATE CONSTRAINT TRIGGER "aliases_check_members" AFTER INSERT ON "public"."aliases" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_alias_members"();
CREATE CONSTRAINT TRIGGER "alias_members_check_members" AFTER DELETE OR UPDATE ON "public"."alias_members" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_alias_members"();

-- Each side of a transaction has one or more parties, and its shares sum to
-- the amount (PLAN.md, D6).
CREATE CONSTRAINT TRIGGER "transactions_check_sides" AFTER INSERT OR UPDATE ON "public"."transactions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_transaction_sides"();
CREATE CONSTRAINT TRIGGER "transaction_parties_check_sides" AFTER INSERT OR DELETE OR UPDATE ON "public"."transaction_parties" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."check_transaction_sides"();
