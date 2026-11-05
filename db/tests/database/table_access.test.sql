-- Checks the access of the PostgREST roles to the tables (PLAN.md, D3):
--
-- - anon gets nothing.
-- - authenticated reads each table, and does each permitted write, in each
--   space. The grants limit the columns.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(20);

-- anon

select is_empty(
  $$ select c.relname::text
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'v', 'm')
       and (
         has_table_privilege('anon', c.oid, 'select')
         or has_table_privilege('anon', c.oid, 'insert')
         or has_table_privilege('anon', c.oid, 'update')
         or has_table_privilege('anon', c.oid, 'delete')
       ) $$,
  'anon has no privilege on a table or a view in public'
);

select ok(
  not has_schema_privilege('anon', 'better_auth', 'usage')
  and not has_schema_privilege('authenticated', 'better_auth', 'usage'),
  'anon and authenticated have no USAGE on the schema better_auth'
);

select tests.authenticate_as_anon();

select throws_ok(
  'select * from public.spaces',
  '42501',
  null,
  'select.spaces: anon is refused'
);

-- authenticated: user B reads and writes the rows of space A. Each user can
-- read and change all spaces.

select tests.authenticate_as('00000000-0000-0000-0000-00000000000b');

select set_eq(
  'select id from public.spaces',
  array['10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b']::uuid[],
  'select.spaces: a user reads all spaces'
);

select isnt_empty(
  $$ select 1 from public.space_currencies where space_id = '10000000-0000-0000-0000-00000000000a' $$,
  'select.space_currencies: a user reads the currencies of a space of a different user'
);

select isnt_empty(
  $$ select 1 from public.members where space_id = '10000000-0000-0000-0000-00000000000a' $$,
  'select.members: a user reads the members of each space'
);

select isnt_empty(
  $$ select 1 from public.aliases join public.alias_members on alias_members.alias_id = aliases.id $$,
  'select.aliases, alias_members: a user reads the aliases and their members'
);

select isnt_empty(
  $$ select 1 from public.transactions join public.transaction_parties on transaction_parties.transaction_id = transactions.id $$,
  'select.transactions, transaction_parties: a user reads the transactions and their parties'
);

select set_eq(
  'select id, name from public.app_users',
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid, 'user-a@test.invalid'),
            ('00000000-0000-0000-0000-00000000000b'::uuid, 'user-b@test.invalid') $$,
  'select.app_users: a user reads the names of all users'
);

select throws_ok(
  'select * from better_auth.users',
  '42501',
  null,
  'select.better_auth.users: authenticated is refused'
);

select isnt_empty(
  $$ insert into public.members (space_id, name)
     values ('10000000-0000-0000-0000-00000000000a', 'Melania')
     returning id $$,
  'insert.members: a user adds a member to a space of a different user'
);

select isnt_empty(
  $$ update public.members set name = 'Barack H.'
     where id = '20000000-0000-0000-0000-0000000000a1'
     returning id $$,
  'update.members: a user renames a member'
);

select isnt_empty(
  $$ update public.spaces set title = 'Space A, renamed'
     where id = '10000000-0000-0000-0000-00000000000a'
     returning id $$,
  'update.spaces: a user renames a space of a different user'
);

select is(
  (select slug from public.spaces where id = '10000000-0000-0000-0000-00000000000a'),
  '10000000-0000-0000-0000-00000000000a',
  'insert.spaces: a new space gets its ID as slug'
);

select isnt_empty(
  $$ update public.spaces set slug = 'space-a'
     where id = '10000000-0000-0000-0000-00000000000a'
     returning id $$,
  'update.spaces: a user changes the slug of a space'
);

select throws_ok(
  $$ update public.spaces set slug = 'space-a'
     where id = '10000000-0000-0000-0000-00000000000b' $$,
  '23505',
  null,
  'update.spaces: two spaces cannot have the same slug'
);

select throws_ok(
  $$ update public.spaces set slug = 'Space A'
     where id = '10000000-0000-0000-0000-00000000000b' $$,
  '23514',
  null,
  'update.spaces: a slug has only small letters, digits, and hyphens'
);

select throws_ok(
  $$ update public.spaces set created_by = '00000000-0000-0000-0000-00000000000b'
     where id = '10000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'update.spaces: a user cannot update created_by'
);

select throws_ok(
  $$ update public.transactions set space_id = '10000000-0000-0000-0000-00000000000b'
     where id = '40000000-0000-0000-0000-00000000000a' $$,
  '42501',
  null,
  'update.transactions: a user cannot move a transaction to a different space'
);

select isnt_empty(
  $$ delete from public.spaces where id = '10000000-0000-0000-0000-00000000000a' returning id $$,
  'delete.spaces: a user deletes a space with all its rows'
);

select * from finish();

rollback;
