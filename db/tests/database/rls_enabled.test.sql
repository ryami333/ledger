-- Checks that each table in the public schema has row level security, and
-- that each view, except app_users, runs as its caller.

begin;

select plan(3);

select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'Each table in public has row level security'
);

-- A view runs with the rights of its owner by default, thus it skips row
-- level security. A materialized view cannot have row level security.
-- app_users is the exception (PLAN.md, D3): it reads better_auth.users as its
-- owner, and it shows only id, name, and image.
select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname <> 'app_users'
      and (
        c.relkind = 'm'
        or (
          c.relkind = 'v'
          and not coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
        )
      )
  $$,
  'Public has no materialized view, and each view except app_users sets security_invoker'
);

select columns_are(
  'public', 'app_users', array['id', 'name', 'image'],
  'app_users shows only id, name, and image'
);

select * from finish();

rollback;
