-- Checks the column role of better_auth.users (PLAN.md, D19). A new user
-- gets 'guest', the role with the fewest rights. The check refuses each
-- value other than 'admin' and 'guest'.

begin;

\ir helpers.psql

select plan(4);

select tests.create_user('00000000-0000-0000-0000-0000000000c1', 'new@example.com');

select is(
  (select role from better_auth.users where id = '00000000-0000-0000-0000-0000000000c1'),
  'guest',
  'users.role: a new user with no role gets guest'
);

select lives_ok(
  $$ update better_auth.users set role = 'admin'
     where id = '00000000-0000-0000-0000-0000000000c1' $$,
  'users.role: admin is a valid role'
);

select throws_ok(
  $$ update better_auth.users set role = 'owner'
     where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '23514',
  null,
  'users.role: a third value is refused'
);

select throws_ok(
  $$ update better_auth.users set role = null
     where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '23502',
  null,
  'users.role: null is refused'
);

select * from finish();

rollback;
