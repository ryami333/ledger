-- Lets only an admin change and delete the row of a space (PLAN.md, D20). A
-- guest still reads the spaces of the guest, and changes their members,
-- aliases, currencies, and transactions.
--
-- Safe to run two times: each policy is dropped with "if exists" before it
-- is made.
--
-- Rollback: make spaces_update_authenticated and spaces_delete_authenticated
-- again with "public.can_access_space(id)", as in 0012_space_guests.sql.

DROP POLICY IF EXISTS "spaces_delete_authenticated" ON "public"."spaces";

DROP POLICY IF EXISTS "spaces_update_authenticated" ON "public"."spaces";

CREATE POLICY "spaces_delete_authenticated" ON "public"."spaces" FOR DELETE TO "authenticated" USING (public.current_user_is_admin());

CREATE POLICY "spaces_update_authenticated" ON "public"."spaces" FOR UPDATE TO "authenticated" USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
