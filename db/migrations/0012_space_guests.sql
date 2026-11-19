-- Limits a guest to the spaces of the guest (PLAN.md, D20). The new table
-- space_guests holds the spaces of each guest. An admin reads and changes
-- all spaces. The RLS policies of each table of a space call
-- can_access_space. Only an admin makes a space, and writes space_guests.
--
-- current_user_is_admin is SECURITY DEFINER, because authenticated cannot
-- read better_auth.users.
--
-- The insert at the end gives each guest the spaces where the guest has a
-- linked member. The guest loses the other spaces.
--
-- Safe to run two times: each policy is dropped with "if exists" before it
-- is made, the table and the index use "if not exists", the functions and
-- the triggers use "or replace", and the insert uses "on conflict do
-- nothing".
--
-- Rollback: drop the policies of space_guests, then make each other policy
-- of this migration again with "using (true)" and "with check (true)", as in
-- 0001_baseline.sql. Make linked_members_insert_authenticated and
-- linked_members_select_authenticated again as in 0009_linked_members.sql,
-- and default_spaces_insert_authenticated and
-- default_spaces_select_authenticated as in 0010_default_spaces.sql. Then
-- drop the functions set_space_guests, can_access_space, and
-- current_user_is_admin, and drop the table space_guests.

set local check_function_bodies = off;

DROP POLICY IF EXISTS "alias_members_delete_authenticated" ON "public"."alias_members";

DROP POLICY IF EXISTS "alias_members_insert_authenticated" ON "public"."alias_members";

DROP POLICY IF EXISTS "alias_members_select_authenticated" ON "public"."alias_members";

DROP POLICY IF EXISTS "aliases_delete_authenticated" ON "public"."aliases";

DROP POLICY IF EXISTS "aliases_insert_authenticated" ON "public"."aliases";

DROP POLICY IF EXISTS "aliases_select_authenticated" ON "public"."aliases";

DROP POLICY IF EXISTS "aliases_update_authenticated" ON "public"."aliases";

DROP POLICY IF EXISTS "default_spaces_insert_authenticated" ON "public"."default_spaces";

DROP POLICY IF EXISTS "default_spaces_select_authenticated" ON "public"."default_spaces";

DROP POLICY IF EXISTS "linked_members_insert_authenticated" ON "public"."linked_members";

DROP POLICY IF EXISTS "linked_members_select_authenticated" ON "public"."linked_members";

DROP POLICY IF EXISTS "members_delete_authenticated" ON "public"."members";

DROP POLICY IF EXISTS "members_insert_authenticated" ON "public"."members";

DROP POLICY IF EXISTS "members_select_authenticated" ON "public"."members";

DROP POLICY IF EXISTS "members_update_authenticated" ON "public"."members";

DROP POLICY IF EXISTS "space_currencies_delete_authenticated" ON "public"."space_currencies";

DROP POLICY IF EXISTS "space_currencies_insert_authenticated" ON "public"."space_currencies";

DROP POLICY IF EXISTS "space_currencies_select_authenticated" ON "public"."space_currencies";

DROP POLICY IF EXISTS "space_currencies_update_authenticated" ON "public"."space_currencies";

DROP POLICY IF EXISTS "spaces_delete_authenticated" ON "public"."spaces";

DROP POLICY IF EXISTS "spaces_insert_authenticated" ON "public"."spaces";

DROP POLICY IF EXISTS "spaces_select_authenticated" ON "public"."spaces";

DROP POLICY IF EXISTS "spaces_update_authenticated" ON "public"."spaces";

DROP POLICY IF EXISTS "transaction_parties_delete_authenticated" ON "public"."transaction_parties";

DROP POLICY IF EXISTS "transaction_parties_insert_authenticated" ON "public"."transaction_parties";

DROP POLICY IF EXISTS "transaction_parties_select_authenticated" ON "public"."transaction_parties";

DROP POLICY IF EXISTS "transactions_delete_authenticated" ON "public"."transactions";

DROP POLICY IF EXISTS "transactions_insert_authenticated" ON "public"."transactions";

DROP POLICY IF EXISTS "transactions_select_authenticated" ON "public"."transactions";

DROP POLICY IF EXISTS "transactions_update_authenticated" ON "public"."transactions";

CREATE TABLE IF NOT EXISTS "public"."space_guests" ("space_id" uuid NOT NULL, "user_id" uuid NOT NULL, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "space_guests_pkey" PRIMARY KEY (space_id, user_id), CONSTRAINT "space_guests_space_id_fkey" FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE, CONSTRAINT "space_guests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE);

ALTER TABLE "public"."space_guests" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_space(p_space_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select public.current_user_is_admin()
    or exists (
      select 1
      from public.space_guests
      where space_guests.space_id = p_space_id
        and space_guests.user_id = public.current_user_id()
    );
$function$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (
      select users.role = 'admin'
      from better_auth.users
      where users.id = public.current_user_id()
    ),
    false
  );
$function$;

CREATE OR REPLACE FUNCTION public.set_space_guests(p_user_id uuid, p_space_ids uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not public.current_user_is_admin() then
    raise exception 'Only an admin can change the spaces of a guest.'
      using errcode = '42501';
  end if;

  delete from public.space_guests
  where space_guests.user_id = p_user_id
    and space_guests.space_id <> all (p_space_ids);

  insert into public.space_guests (space_id, user_id)
  select space_id, p_user_id
  from pg_catalog.unnest(p_space_ids) as space_ids (space_id)
  on conflict do nothing;

  return p_user_id;
end;
$function$;

CREATE INDEX IF NOT EXISTS space_guests_user_id_idx ON public.space_guests USING btree (user_id);

CREATE OR REPLACE TRIGGER space_guests_set_created_at BEFORE INSERT OR UPDATE ON public.space_guests FOR EACH ROW EXECUTE FUNCTION public.set_created_at();

CREATE OR REPLACE TRIGGER space_guests_set_updated_at BEFORE INSERT OR UPDATE ON public.space_guests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "alias_members_delete_authenticated" ON "public"."alias_members" FOR DELETE TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "alias_members_insert_authenticated" ON "public"."alias_members" FOR INSERT TO "authenticated" WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "alias_members_select_authenticated" ON "public"."alias_members" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "aliases_delete_authenticated" ON "public"."aliases" FOR DELETE TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "aliases_insert_authenticated" ON "public"."aliases" FOR INSERT TO "authenticated" WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "aliases_select_authenticated" ON "public"."aliases" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "aliases_update_authenticated" ON "public"."aliases" FOR UPDATE TO "authenticated" USING (public.can_access_space(space_id)) WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "default_spaces_insert_authenticated" ON "public"."default_spaces" FOR INSERT TO "authenticated" WITH CHECK (((user_id = public.current_user_id()) AND public.can_access_space(space_id)));

CREATE POLICY "default_spaces_select_authenticated" ON "public"."default_spaces" FOR SELECT TO "authenticated" USING (((user_id = public.current_user_id()) AND public.can_access_space(space_id)));

CREATE POLICY "linked_members_insert_authenticated" ON "public"."linked_members" FOR INSERT TO "authenticated" WITH CHECK (((user_id = public.current_user_id()) AND public.can_access_space(space_id)));

CREATE POLICY "linked_members_select_authenticated" ON "public"."linked_members" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "members_delete_authenticated" ON "public"."members" FOR DELETE TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "members_insert_authenticated" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "members_select_authenticated" ON "public"."members" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "members_update_authenticated" ON "public"."members" FOR UPDATE TO "authenticated" USING (public.can_access_space(space_id)) WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "space_currencies_delete_authenticated" ON "public"."space_currencies" FOR DELETE TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "space_currencies_insert_authenticated" ON "public"."space_currencies" FOR INSERT TO "authenticated" WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "space_currencies_select_authenticated" ON "public"."space_currencies" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "space_currencies_update_authenticated" ON "public"."space_currencies" FOR UPDATE TO "authenticated" USING (public.can_access_space(space_id)) WITH CHECK (public.can_access_space(space_id));

DROP POLICY IF EXISTS "space_guests_delete_authenticated" ON "public"."space_guests";

CREATE POLICY "space_guests_delete_authenticated" ON "public"."space_guests" FOR DELETE TO "authenticated" USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "space_guests_insert_authenticated" ON "public"."space_guests";

CREATE POLICY "space_guests_insert_authenticated" ON "public"."space_guests" FOR INSERT TO "authenticated" WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "space_guests_select_authenticated" ON "public"."space_guests";

CREATE POLICY "space_guests_select_authenticated" ON "public"."space_guests" FOR SELECT TO "authenticated" USING (((user_id = public.current_user_id()) OR public.current_user_is_admin()));

CREATE POLICY "spaces_delete_authenticated" ON "public"."spaces" FOR DELETE TO "authenticated" USING (public.can_access_space(id));

CREATE POLICY "spaces_insert_authenticated" ON "public"."spaces" FOR INSERT TO "authenticated" WITH CHECK (public.current_user_is_admin());

CREATE POLICY "spaces_select_authenticated" ON "public"."spaces" FOR SELECT TO "authenticated" USING (public.can_access_space(id));

CREATE POLICY "spaces_update_authenticated" ON "public"."spaces" FOR UPDATE TO "authenticated" USING (public.can_access_space(id)) WITH CHECK (public.can_access_space(id));

CREATE POLICY "transaction_parties_delete_authenticated" ON "public"."transaction_parties" FOR DELETE TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "transaction_parties_insert_authenticated" ON "public"."transaction_parties" FOR INSERT TO "authenticated" WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "transaction_parties_select_authenticated" ON "public"."transaction_parties" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "transactions_delete_authenticated" ON "public"."transactions" FOR DELETE TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "transactions_insert_authenticated" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (public.can_access_space(space_id));

CREATE POLICY "transactions_select_authenticated" ON "public"."transactions" FOR SELECT TO "authenticated" USING (public.can_access_space(space_id));

CREATE POLICY "transactions_update_authenticated" ON "public"."transactions" FOR UPDATE TO "authenticated" USING (public.can_access_space(space_id)) WITH CHECK (public.can_access_space(space_id));

REVOKE ALL ON FUNCTION "public"."can_access_space"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."can_access_space"(uuid) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."current_user_is_admin"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."current_user_is_admin"() TO "authenticated";

REVOKE ALL ON FUNCTION "public"."set_space_guests"(uuid, uuid[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_space_guests"(uuid, uuid[]) TO "authenticated";

GRANT INSERT ("space_id") ON TABLE "public"."space_guests" TO "authenticated";

GRANT INSERT ("user_id") ON TABLE "public"."space_guests" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."space_guests" TO "authenticated";

insert into public.space_guests (space_id, user_id)
select linked_members.space_id, linked_members.user_id
from public.linked_members
join better_auth.users on users.id = linked_members.user_id
where users.role = 'guest'
on conflict do nothing;
