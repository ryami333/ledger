-- The grants of the tables and the functions. The RLS policies
-- (700_policies.sql) select the rows. These grants select the roles and the
-- columns.
--
-- Postgres gives EXECUTE on a new function to public. This file removes it,
-- then gives back only what the web app needs. Thus a new table or function
-- needs a grant here. `yarn db:diff` copies the grants and the default
-- privileges into the migration.
--
-- The functions of PLAN.md, D9 run as the caller (SECURITY INVOKER). Thus
-- authenticated has the INSERT and UPDATE grants that these functions use.
-- The deferred constraint triggers (600_triggers.sql) keep the rules of the
-- lists also for a direct write through PostgREST.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;

-- authenticated reads each table and the view app_users.
grant select on all tables in schema public to authenticated;

grant insert ("title", "description") on "public"."spaces" to authenticated;
grant update ("slug", "title", "description") on "public"."spaces" to authenticated;
grant delete on "public"."spaces" to authenticated;

grant insert ("space_id", "currency", "rate", "is_default") on "public"."space_currencies" to authenticated;
grant update ("rate", "is_default") on "public"."space_currencies" to authenticated;
grant delete on "public"."space_currencies" to authenticated;

grant insert ("space_id", "name") on "public"."members" to authenticated;
grant update ("name", "archived_at") on "public"."members" to authenticated;
grant delete on "public"."members" to authenticated;

grant insert ("space_id", "name") on "public"."aliases" to authenticated;
grant update ("name") on "public"."aliases" to authenticated;
grant delete on "public"."aliases" to authenticated;

grant insert ("alias_id", "member_id", "space_id") on "public"."alias_members" to authenticated;
grant delete on "public"."alias_members" to authenticated;

grant insert ("space_id", "title", "description", "amount_minor", "currency", "rate", "transaction_date") on "public"."transactions" to authenticated;
grant update ("title", "description", "amount_minor", "currency", "rate", "transaction_date") on "public"."transactions" to authenticated;
grant delete on "public"."transactions" to authenticated;

grant insert ("transaction_id", "space_id", "side", "member_id", "alias_id", "share_minor") on "public"."transaction_parties" to authenticated;
grant delete on "public"."transaction_parties" to authenticated;

-- better-auth owns the schema better_auth. No PostgREST role reads it. The
-- view app_users reads it as its owner.
revoke all on schema "better_auth" from public, anon, authenticated;

-- Functions. A trigger function needs no EXECUTE grant for the caller.
revoke execute on function "public"."set_space_slug"() from public, anon, authenticated;
revoke execute on function "public"."set_created_at"() from public, anon, authenticated;
revoke execute on function "public"."set_updated_at"() from public, anon, authenticated;
revoke execute on function "public"."set_actor_on_insert"() from public, anon, authenticated;
revoke execute on function "public"."set_actor_on_write"() from public, anon, authenticated;
revoke execute on function "public"."check_space_default_currency"() from public, anon, authenticated;
revoke execute on function "public"."check_alias_members"() from public, anon, authenticated;
revoke execute on function "public"."check_transaction_sides"() from public, anon, authenticated;

-- The actor triggers call current_user_id as the role of the request.
revoke execute on function "public"."current_user_id"() from public, anon;
grant execute on function "public"."current_user_id"() to authenticated;

-- The web app calls the functions of PLAN.md, D9 with the user client.
revoke execute on function "public"."create_space"("text", "text", "text", "text"[]) from public, anon;
grant execute on function "public"."create_space"("text", "text", "text", "text"[]) to authenticated;
revoke execute on function "public"."save_space_currencies"("uuid", "jsonb") from public, anon;
grant execute on function "public"."save_space_currencies"("uuid", "jsonb") to authenticated;
revoke execute on function "public"."save_alias"("uuid", "uuid", "text", "uuid"[]) from public, anon;
grant execute on function "public"."save_alias"("uuid", "uuid", "text", "uuid"[]) to authenticated;
revoke execute on function "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "text", "date", "jsonb", "jsonb") from public, anon;
grant execute on function "public"."save_transaction"("uuid", "uuid", "text", "text", bigint, "text", "text", "date", "jsonb", "jsonb") to authenticated;
revoke execute on function "public"."import_transactions"("uuid", "jsonb", "jsonb") from public, anon;
grant execute on function "public"."import_transactions"("uuid", "jsonb", "jsonb") to authenticated;
