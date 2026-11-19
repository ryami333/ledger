-- The RLS policies (PLAN.md, D3 and D20). An admin reads and changes all
-- spaces. A guest reads and changes only the spaces of the guest in
-- space_guests. can_access_space checks both cases. Only an admin makes,
-- changes, and deletes the row of a space. A guest changes the members, the
-- aliases, the currencies, and the transactions of a space of the guest. The
-- grants (800_grants.sql) select the columns. The role anon has
-- no grant, thus it has no policy here.

-- spaces

CREATE POLICY "spaces_select_authenticated" ON "public"."spaces" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("id"));
CREATE POLICY "spaces_insert_authenticated" ON "public"."spaces" FOR INSERT TO "authenticated" WITH CHECK ("public"."current_user_is_admin"());
CREATE POLICY "spaces_update_authenticated" ON "public"."spaces" FOR UPDATE TO "authenticated" USING ("public"."current_user_is_admin"()) WITH CHECK ("public"."current_user_is_admin"());
CREATE POLICY "spaces_delete_authenticated" ON "public"."spaces" FOR DELETE TO "authenticated" USING ("public"."current_user_is_admin"());

-- space_currencies

CREATE POLICY "space_currencies_select_authenticated" ON "public"."space_currencies" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "space_currencies_insert_authenticated" ON "public"."space_currencies" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "space_currencies_update_authenticated" ON "public"."space_currencies" FOR UPDATE TO "authenticated" USING ("public"."can_access_space"("space_id")) WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "space_currencies_delete_authenticated" ON "public"."space_currencies" FOR DELETE TO "authenticated" USING ("public"."can_access_space"("space_id"));

-- members

CREATE POLICY "members_select_authenticated" ON "public"."members" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "members_insert_authenticated" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "members_update_authenticated" ON "public"."members" FOR UPDATE TO "authenticated" USING ("public"."can_access_space"("space_id")) WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "members_delete_authenticated" ON "public"."members" FOR DELETE TO "authenticated" USING ("public"."can_access_space"("space_id"));

-- aliases

CREATE POLICY "aliases_select_authenticated" ON "public"."aliases" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "aliases_insert_authenticated" ON "public"."aliases" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "aliases_update_authenticated" ON "public"."aliases" FOR UPDATE TO "authenticated" USING ("public"."can_access_space"("space_id")) WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "aliases_delete_authenticated" ON "public"."aliases" FOR DELETE TO "authenticated" USING ("public"."can_access_space"("space_id"));

-- alias_members

CREATE POLICY "alias_members_select_authenticated" ON "public"."alias_members" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "alias_members_insert_authenticated" ON "public"."alias_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "alias_members_delete_authenticated" ON "public"."alias_members" FOR DELETE TO "authenticated" USING ("public"."can_access_space"("space_id"));

-- transactions

CREATE POLICY "transactions_select_authenticated" ON "public"."transactions" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "transactions_insert_authenticated" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "transactions_update_authenticated" ON "public"."transactions" FOR UPDATE TO "authenticated" USING ("public"."can_access_space"("space_id")) WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "transactions_delete_authenticated" ON "public"."transactions" FOR DELETE TO "authenticated" USING ("public"."can_access_space"("space_id"));

-- transaction_parties

CREATE POLICY "transaction_parties_select_authenticated" ON "public"."transaction_parties" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "transaction_parties_insert_authenticated" ON "public"."transaction_parties" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_access_space"("space_id"));
CREATE POLICY "transaction_parties_delete_authenticated" ON "public"."transaction_parties" FOR DELETE TO "authenticated" USING ("public"."can_access_space"("space_id"));

-- linked_members (PLAN.md, D16). A user reads all rows of each space that
-- the user can access, so the settings show who selected a member. A user
-- inserts and deletes only the rows of the user itself. There is no update: set_linked_member deletes, then inserts.

CREATE POLICY "linked_members_select_authenticated" ON "public"."linked_members" FOR SELECT TO "authenticated" USING ("public"."can_access_space"("space_id"));
CREATE POLICY "linked_members_insert_authenticated" ON "public"."linked_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "public"."current_user_id"()) AND "public"."can_access_space"("space_id")));
CREATE POLICY "linked_members_delete_authenticated" ON "public"."linked_members" FOR DELETE TO "authenticated" USING ("user_id" = "public"."current_user_id"());

-- default_spaces (PLAN.md, D17). A user reads, inserts, and deletes only the
-- row of the user itself. A user reads and inserts only a space that the user
-- can access. Thus a guest that loses a space also loses it as default space. There is no update: set_default_space deletes, then
-- inserts.

CREATE POLICY "default_spaces_select_authenticated" ON "public"."default_spaces" FOR SELECT TO "authenticated" USING ((("user_id" = "public"."current_user_id"()) AND "public"."can_access_space"("space_id")));
CREATE POLICY "default_spaces_insert_authenticated" ON "public"."default_spaces" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "public"."current_user_id"()) AND "public"."can_access_space"("space_id")));
CREATE POLICY "default_spaces_delete_authenticated" ON "public"."default_spaces" FOR DELETE TO "authenticated" USING ("user_id" = "public"."current_user_id"());

-- space_guests (PLAN.md, D20). An admin reads all rows, and a guest reads
-- the rows of the guest itself. Only an admin inserts and deletes. There is
-- no update: set_space_guests deletes, then inserts.

CREATE POLICY "space_guests_select_authenticated" ON "public"."space_guests" FOR SELECT TO "authenticated" USING ((("user_id" = "public"."current_user_id"()) OR "public"."current_user_is_admin"()));
CREATE POLICY "space_guests_insert_authenticated" ON "public"."space_guests" FOR INSERT TO "authenticated" WITH CHECK ("public"."current_user_is_admin"());
CREATE POLICY "space_guests_delete_authenticated" ON "public"."space_guests" FOR DELETE TO "authenticated" USING ("public"."current_user_is_admin"());
