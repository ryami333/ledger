-- Checks that current_user_is_admin is the only SECURITY DEFINER function in
-- the public schema, and that each function sets search_path to an empty
-- string (PLAN.md, D3, D9, and D20).
--
-- current_user_is_admin reads better_auth.users as its owner (D20). The view
-- app_users also runs as its owner. A function
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
      and p.oid <> 'public.current_user_is_admin()'::regprocedure
  $$,
  'The public schema has no SECURITY DEFINER function other than current_user_is_admin'
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
