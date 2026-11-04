-- The roles of PostgREST. PostgREST connects as authenticator and then
-- changes to the role of the JWT: anon or authenticated. ledger has no worker,
-- thus it has no service_role.
--
-- A role belongs to the cluster, not to one database. Thus each statement
-- checks first. The migration script gives authenticator the password of
-- DATABASE_URL after each run (src/scripts/migrateDatabase.ts).
--
-- gen_random_uuid() is part of Postgres, thus the schema needs no extension.
do $$
begin
  if not exists (select from pg_catalog.pg_roles where rolname = 'anon') then
    create role "anon" nologin noinherit;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role "authenticated" nologin noinherit;
  end if;
  if not exists (select from pg_catalog.pg_roles where rolname = 'authenticator') then
    create role "authenticator" login noinherit;
  end if;
end
$$;

grant "anon", "authenticated" to "authenticator";
