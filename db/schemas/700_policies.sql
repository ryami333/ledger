-- The RLS policies (PLAN.md, D3). Each user can read and change all spaces.
-- Thus each policy allows its action to the role authenticated, with no row
-- condition. The grants (800_grants.sql) select the columns. The role anon
-- has no grant, thus it has no policy here.
--
-- RLS stays on, so that a later rule ("a user sees only some spaces") needs
-- only new policies.

-- spaces

CREATE POLICY "spaces_select_authenticated" ON "public"."spaces" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "spaces_insert_authenticated" ON "public"."spaces" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "spaces_update_authenticated" ON "public"."spaces" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "spaces_delete_authenticated" ON "public"."spaces" FOR DELETE TO "authenticated" USING (true);

-- space_currencies

CREATE POLICY "space_currencies_select_authenticated" ON "public"."space_currencies" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "space_currencies_insert_authenticated" ON "public"."space_currencies" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "space_currencies_update_authenticated" ON "public"."space_currencies" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "space_currencies_delete_authenticated" ON "public"."space_currencies" FOR DELETE TO "authenticated" USING (true);

-- members

CREATE POLICY "members_select_authenticated" ON "public"."members" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "members_insert_authenticated" ON "public"."members" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "members_update_authenticated" ON "public"."members" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "members_delete_authenticated" ON "public"."members" FOR DELETE TO "authenticated" USING (true);

-- aliases

CREATE POLICY "aliases_select_authenticated" ON "public"."aliases" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "aliases_insert_authenticated" ON "public"."aliases" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "aliases_update_authenticated" ON "public"."aliases" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "aliases_delete_authenticated" ON "public"."aliases" FOR DELETE TO "authenticated" USING (true);

-- alias_members

CREATE POLICY "alias_members_select_authenticated" ON "public"."alias_members" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "alias_members_insert_authenticated" ON "public"."alias_members" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "alias_members_delete_authenticated" ON "public"."alias_members" FOR DELETE TO "authenticated" USING (true);

-- transactions

CREATE POLICY "transactions_select_authenticated" ON "public"."transactions" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "transactions_insert_authenticated" ON "public"."transactions" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "transactions_update_authenticated" ON "public"."transactions" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
CREATE POLICY "transactions_delete_authenticated" ON "public"."transactions" FOR DELETE TO "authenticated" USING (true);

-- transaction_parties

CREATE POLICY "transaction_parties_select_authenticated" ON "public"."transaction_parties" FOR SELECT TO "authenticated" USING (true);
CREATE POLICY "transaction_parties_insert_authenticated" ON "public"."transaction_parties" FOR INSERT TO "authenticated" WITH CHECK (true);
CREATE POLICY "transaction_parties_delete_authenticated" ON "public"."transaction_parties" FOR DELETE TO "authenticated" USING (true);
