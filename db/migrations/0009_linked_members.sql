-- Adds linked_members: the member that a user is in a space (PLAN.md, D16).
-- The trigger linked_members_set_user_id sets user_id from the JWT. RLS lets
-- each user read all rows, and insert and delete only the rows of the user
-- itself. set_linked_member replaces the linked member of the current user.
--
-- Safe to run two times: the table and the index use "if not exists", each
-- foreign key and each policy is dropped with "if exists" before it is
-- added, the function and the triggers are replaced, and the grants are safe
-- on a second run.
--
-- Rollback: drop the function set_linked_member(uuid, uuid), then drop the
-- table linked_members with its policies and triggers. No earlier migration
-- defines them.

set local check_function_bodies = off;

CREATE TABLE IF NOT EXISTS "public"."linked_members" ("space_id" uuid NOT NULL, "user_id" uuid NOT NULL, "member_id" uuid NOT NULL, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "linked_members_pkey" PRIMARY KEY (space_id, user_id), CONSTRAINT "linked_members_space_id_member_id_key" UNIQUE (space_id, member_id));

ALTER TABLE "public"."linked_members" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_linked_member(p_space_id uuid, p_member_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.linked_members
  where linked_members.space_id = p_space_id
    and linked_members.user_id = public.current_user_id();

  if p_member_id is not null then
    insert into public.linked_members (space_id, member_id)
    values (p_space_id, p_member_id);
  end if;

  return p_space_id;
end;
$function$;

ALTER TABLE "public"."linked_members" DROP CONSTRAINT IF EXISTS "linked_members_member_fkey";
ALTER TABLE "public"."linked_members" ADD CONSTRAINT "linked_members_member_fkey" FOREIGN KEY (space_id, member_id) REFERENCES public.members(space_id, id) ON DELETE CASCADE;

ALTER TABLE "public"."linked_members" DROP CONSTRAINT IF EXISTS "linked_members_space_id_fkey";
ALTER TABLE "public"."linked_members" ADD CONSTRAINT "linked_members_space_id_fkey" FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."linked_members" DROP CONSTRAINT IF EXISTS "linked_members_user_id_fkey";
ALTER TABLE "public"."linked_members" ADD CONSTRAINT "linked_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS linked_members_user_id_idx ON public.linked_members USING btree (user_id);

CREATE OR REPLACE TRIGGER linked_members_set_created_at BEFORE INSERT OR UPDATE ON public.linked_members FOR EACH ROW EXECUTE FUNCTION public.set_created_at();

CREATE OR REPLACE TRIGGER linked_members_set_updated_at BEFORE INSERT OR UPDATE ON public.linked_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER linked_members_set_user_id BEFORE INSERT OR UPDATE ON public.linked_members FOR EACH ROW EXECUTE FUNCTION public.set_actor_on_insert('user_id');

DROP POLICY IF EXISTS "linked_members_delete_authenticated" ON "public"."linked_members";
CREATE POLICY "linked_members_delete_authenticated" ON "public"."linked_members" FOR DELETE TO "authenticated" USING ((user_id = public.current_user_id()));

DROP POLICY IF EXISTS "linked_members_insert_authenticated" ON "public"."linked_members";
CREATE POLICY "linked_members_insert_authenticated" ON "public"."linked_members" FOR INSERT TO "authenticated" WITH CHECK ((user_id = public.current_user_id()));

DROP POLICY IF EXISTS "linked_members_select_authenticated" ON "public"."linked_members";
CREATE POLICY "linked_members_select_authenticated" ON "public"."linked_members" FOR SELECT TO "authenticated" USING (true);

REVOKE ALL ON FUNCTION "public"."set_linked_member"(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_linked_member"(uuid, uuid) TO "authenticated";

GRANT INSERT ("member_id") ON TABLE "public"."linked_members" TO "authenticated";

GRANT INSERT ("space_id") ON TABLE "public"."linked_members" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."linked_members" TO "authenticated";
