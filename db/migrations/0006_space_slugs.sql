-- Adds the column spaces.slug: the route identifier of a space,
-- /spaces/<slug>. The user can change it. The trigger spaces_set_slug gives a
-- new space its ID as slug.
--
-- The backfill copies the ID of each old space to its slug, so each old link
-- stays correct. It disables spaces_set_updated_at and spaces_set_updated_by,
-- so that updated_at and updated_by keep their old values.
--
-- Safe to run two times: the column uses "if not exists", the backfill finds
-- no row after the first run, the constraints are dropped first, and the
-- function and the trigger are replaced.
--
-- Rollback: drop the trigger spaces_set_slug and the function
-- set_space_slug(). Drop the constraints spaces_slug_key and
-- spaces_slug_check, then the column spaces.slug. The grants of
-- 0001_baseline.sql then apply again.

set local check_function_bodies = off;

ALTER TABLE "public"."spaces" ADD COLUMN IF NOT EXISTS "slug" text;

ALTER TABLE "public"."spaces" DISABLE TRIGGER "spaces_set_updated_at";
ALTER TABLE "public"."spaces" DISABLE TRIGGER "spaces_set_updated_by";

UPDATE "public"."spaces"
SET "slug" = "id"::text
WHERE "slug" IS NULL;

ALTER TABLE "public"."spaces" ENABLE TRIGGER "spaces_set_updated_at";
ALTER TABLE "public"."spaces" ENABLE TRIGGER "spaces_set_updated_by";

ALTER TABLE "public"."spaces" ALTER COLUMN "slug" SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_space_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.slug is null then
    new.slug := new.id::text;
  end if;

  return new;
end;
$function$;

ALTER TABLE "public"."spaces" DROP CONSTRAINT IF EXISTS "spaces_slug_check";
ALTER TABLE "public"."spaces" ADD CONSTRAINT "spaces_slug_check" CHECK (((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text) AND (length(slug) <= 100)));

ALTER TABLE "public"."spaces" DROP CONSTRAINT IF EXISTS "spaces_slug_key";
ALTER TABLE "public"."spaces" ADD CONSTRAINT "spaces_slug_key" UNIQUE (slug);

CREATE OR REPLACE TRIGGER spaces_set_slug BEFORE INSERT ON public.spaces FOR EACH ROW EXECUTE FUNCTION public.set_space_slug();

REVOKE ALL ON FUNCTION "public"."set_space_slug"() FROM PUBLIC, anon, authenticated;

GRANT UPDATE ("slug") ON TABLE "public"."spaces" TO "authenticated";
