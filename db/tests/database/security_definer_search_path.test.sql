-- Checks that the public schema has no SECURITY DEFINER function, and that
-- each function sets search_path to an empty string (PLAN.md, D3 and D9).
--
-- The view app_users is the only object that runs as its owner. A function
-- with no search_path of its own uses the search_path of the caller. A caller
-- can then make the function read an object of the caller.

begin;

select plan(3);

-- A positive control: the second test needs functions to check.
select ok(
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  ),
  'The public schema has functions'
);

select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  $$,
  'The public schema has no SECURITY DEFINER function'
);

select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not coalesce(p.proconfig, '{}'::text[]) @> array['search_path=""']
  $$,
  'Each function in public sets search_path to an empty string'
);

select * from finish();

rollback;
