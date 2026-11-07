-- Adds default_spaces: the default space of a user (PLAN.md, D17). The
-- trigger default_spaces_set_user_id sets user_id from the JWT. RLS lets a
-- user read, insert, and delete only the row of the user itself.
-- set_default_space replaces the default space of the current user.
--
-- Safe to run two times: the table and the index use "if not exists", each
-- foreign key and each policy is dropped with "if exists" before it is
-- added, the function and the triggers are replaced, and the grants are safe
-- on a second run.
--
-- Rollback: drop the function set_default_space(uuid), then drop the table
-- default_spaces with its policies and triggers. No earlier migration
-- defines them.

set local check_function_bodies = off;

CREATE TABLE IF NOT EXISTS "public"."default_spaces" ("user_id" uuid NOT NULL, "space_id" uuid NOT NULL, "created_at" timestamp with time zone NOT NULL DEFAULT now(), "updated_at" timestamp with time zone NOT NULL DEFAULT now(), CONSTRAINT "default_spaces_pkey" PRIMARY KEY (user_id));

ALTER TABLE "public"."default_spaces" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_default_space(p_space_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  delete from public.default_spaces
  where default_spaces.user_id = public.current_user_id();

  if p_space_id is not null then
    insert into public.default_spaces (space_id)
    values (p_space_id);
  end if;

  return public.current_user_id();
end;
$function$;

ALTER TABLE "public"."default_spaces" DROP CONSTRAINT IF EXISTS "default_spaces_space_id_fkey";
ALTER TABLE "public"."default_spaces" ADD CONSTRAINT "default_spaces_space_id_fkey" FOREIGN KEY (space_id) REFERENCES public.spaces(id) ON DELETE CASCADE;

ALTER TABLE "public"."default_spaces" DROP CONSTRAINT IF EXISTS "default_spaces_user_id_fkey";
ALTER TABLE "public"."default_spaces" ADD CONSTRAINT "default_spaces_user_id_fkey" FOREIGN KEY (user_id) REFERENCES better_auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS default_spaces_space_id_idx ON public.default_spaces USING btree (space_id);

CREATE OR REPLACE TRIGGER default_spaces_set_created_at BEFORE INSERT OR UPDATE ON public.default_spaces FOR EACH ROW EXECUTE FUNCTION public.set_created_at();

CREATE OR REPLACE TRIGGER default_spaces_set_updated_at BEFORE INSERT OR UPDATE ON public.default_spaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER default_spaces_set_user_id BEFORE INSERT OR UPDATE ON public.default_spaces FOR EACH ROW EXECUTE FUNCTION public.set_actor_on_insert('user_id');

DROP POLICY IF EXISTS "default_spaces_delete_authenticated" ON "public"."default_spaces";
CREATE POLICY "default_spaces_delete_authenticated" ON "public"."default_spaces" FOR DELETE TO "authenticated" USING ((user_id = public.current_user_id()));

DROP POLICY IF EXISTS "default_spaces_insert_authenticated" ON "public"."default_spaces";
CREATE POLICY "default_spaces_insert_authenticated" ON "public"."default_spaces" FOR INSERT TO "authenticated" WITH CHECK ((user_id = public.current_user_id()));

DROP POLICY IF EXISTS "default_spaces_select_authenticated" ON "public"."default_spaces";
CREATE POLICY "default_spaces_select_authenticated" ON "public"."default_spaces" FOR SELECT TO "authenticated" USING ((user_id = public.current_user_id()));

REVOKE ALL ON FUNCTION "public"."set_default_space"(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_default_space"(uuid) TO "authenticated";

GRANT INSERT ("space_id") ON TABLE "public"."default_spaces" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."default_spaces" TO "authenticated";
