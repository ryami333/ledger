-- The names and the images of the users, for the UI (PLAN.md, D3). PostgREST
-- cannot read the schema better_auth. This view runs as its owner, thus it
-- reads better_auth.users with no grant on that schema. It shows no email.
--
-- It is the only view without security_invoker. rls_enabled.test.sql knows
-- this exception.
CREATE OR REPLACE VIEW "public"."app_users" AS
 SELECT "users"."id",
    "users"."name",
    "users"."image"
   FROM "better_auth"."users";
