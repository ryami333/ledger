-- Checks default_spaces and set_default_space (PLAN.md, D17). A user sets
-- and reads only the default space of the user itself, and a delete of the
-- space deletes the row.

begin;

\ir helpers.psql
\ir fixtures.psql

select plan(9);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000a');

select is(
  public.set_default_space('10000000-0000-0000-0000-00000000000a'),
  '00000000-0000-0000-0000-00000000000a'::uuid,
  'set_default_space: user A selects space A, and gets the ID of user A'
);

select results_eq(
  $$ select user_id, space_id from public.default_spaces $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid, '10000000-0000-0000-0000-00000000000a'::uuid) $$,
  'set_default_space: the trigger sets user_id to user A'
);

select lives_ok(
  $$ select public.set_default_space('10000000-0000-0000-0000-00000000000b') $$,
  'set_default_space: user A selects space B in place of space A'
);

select results_eq(
  $$ select space_id from public.default_spaces $$,
  $$ values ('10000000-0000-0000-0000-00000000000b'::uuid) $$,
  'set_default_space: user A has one default space'
);

select throws_ok(
  $$ insert into public.default_spaces (user_id, space_id)
     values ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000a') $$,
  '42501',
  null,
  'insert.default_spaces: user A cannot send user_id'
);

select tests.authenticate_as('00000000-0000-0000-0000-00000000000b');

select is_empty(
  $$ select 1 from public.default_spaces $$,
  'select.default_spaces: user B does not read the row of user A'
);

select is_empty(
  $$ delete from public.default_spaces returning user_id $$,
  'delete.default_spaces: user B cannot delete the row of user A'
);

select tests.clear_authentication();
delete from public.spaces where id = '10000000-0000-0000-0000-00000000000b';

select is_empty(
  $$ select 1 from public.default_spaces
     where user_id = '00000000-0000-0000-0000-00000000000a' $$,
  'delete.spaces: a delete of the space deletes the default space'
);

select tests.authenticate_as_anon();

select throws_ok(
  $$ select * from public.default_spaces $$,
  '42501',
  null,
  'select.default_spaces: anon is refused'
);

select * from finish();

rollback;
