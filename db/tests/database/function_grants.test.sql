-- Checks the EXECUTE grants of the functions in public. Postgres gives
-- EXECUTE on a new function to public, thus a schema file that forgets a
-- revoke fails here.

begin;

select plan(3);

select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and has_function_privilege('anon', p.oid, 'execute') $$,
  'anon has EXECUTE on no function in public'
);

-- The trigger functions need no EXECUTE grant for a caller.
select is_empty(
  $$ select p.oid::regprocedure::text
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and has_function_privilege('authenticated', p.oid, 'execute')
       and p.proname not in (
         'current_user_id', 'create_space', 'save_space_currencies',
         'save_alias', 'save_transaction', 'import_transactions'
       ) $$,
  'authenticated has EXECUTE only on the listed functions in public'
);

select ok(
  has_function_privilege('authenticated', 'public.create_space(text, text, text, text[])', 'execute')
  and has_function_privilege('authenticated', 'public.save_space_currencies(uuid, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.save_alias(uuid, uuid, text, uuid[])', 'execute')
  and has_function_privilege('authenticated', 'public.save_transaction(uuid, uuid, text, text, bigint, text, text, date, jsonb, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.import_transactions(uuid, jsonb, jsonb)', 'execute')
  and has_function_privilege('authenticated', 'public.current_user_id()', 'execute'),
  'authenticated has EXECUTE on the functions of PLAN.md, D9, and on current_user_id'
);

select * from finish();

rollback;
