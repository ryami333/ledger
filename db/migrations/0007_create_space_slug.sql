-- Adds the parameter p_slug to create_space, so that the "New space" modal
-- can give a slug. A null slug gives the ID of the space as slug. Gives
-- authenticated INSERT on spaces.slug, because create_space is SECURITY
-- INVOKER.
--
-- Safe to run two times: the drop uses "if exists", the function is
-- replaced, and the grants and the revokes are safe on a second run.
--
-- Rollback: drop create_space(text, text, text, text[], text). Create
-- create_space(text, text, text, text[]) again as in 0001_baseline.sql, with
-- its grants. Revoke INSERT on spaces.slug from authenticated.

set local check_function_bodies = off;

DROP FUNCTION IF EXISTS "public"."create_space"(text, text, text, text[]);

CREATE OR REPLACE FUNCTION public.create_space(p_title text, p_description text, p_default_currency text, p_member_names text[], p_slug text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_space_id uuid;
begin
  -- A null slug gives the ID of the space as slug (set_space_slug).
  insert into public.spaces (slug, title, description)
  values (p_slug, p_title, p_description)
  returning id into v_space_id;

  insert into public.space_currencies (space_id, currency, rate, is_default)
  values (v_space_id, p_default_currency, 1, true);

  insert into public.members (space_id, name)
  select v_space_id, member_name
  from unnest(coalesce(p_member_names, '{}')) as member_name;

  return v_space_id;
end;
$function$;

REVOKE ALL ON FUNCTION "public"."create_space"(text, text, text, text[], text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION "public"."create_space"(text, text, text, text[], text) TO "authenticated";

GRANT INSERT ("slug") ON TABLE "public"."spaces" TO "authenticated";
